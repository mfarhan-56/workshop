import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronDown, Clock3, Compass, GraduationCap, MapPin, Menu, Search, ShieldCheck, Sparkles, Ticket, Users, X } from 'lucide-react';
import { api } from './api';

const categories = ['All', 'Talks', 'Workshops', 'Culture', 'Sports'];
const art = [
  { image: 'photo-1516321318423-f06f85e504b3', tone: 'indigo', emoji: '✳' },
  { image: 'photo-1523580494863-6f3031224c94', tone: 'plum', emoji: '✦' },
  { image: 'photo-1524178232363-1fb2b075b655', tone: 'amber', emoji: '◌' },
  { image: 'photo-1546519638-68e109498ffc', tone: 'mint', emoji: '↗' },
  { image: 'photo-1517486808906-6ca8b3f04846', tone: 'coral', emoji: '✳' },
];

function prettyDate(value) {
  if (!value) return 'Date to be announced';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(parsed);
}
function initial(name = '') { return name.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || '?'; }
function getSavedUserId() {
  try { return window.localStorage.getItem('campuspulse-user-id') || ''; }
  catch { return ''; }
}
function classify(title = '') {
  const value = title.toLowerCase();
  if (/workshop|lab|masterclass|hack/.test(value)) return 'Workshops';
  if (/sport|game|basket|football|cricket|fitness/.test(value)) return 'Sports';
  if (/music|culture|heritage|festival|dance/.test(value)) return 'Culture';
  return 'Talks';
}

function App() {
  const [events, setEvents] = useState([]);
  const [registered, setRegistered] = useState([]);
  const [userId, setUserId] = useState(getSavedUserId);
  const [userDraft, setUserDraft] = useState(getSavedUserId);
  const [demoUsers, setDemoUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedDemoUser, setSelectedDemoUser] = useState('');
  const [role, setRole] = useState('student');
  const [usersError, setUsersError] = useState('');
  const [showSignup, setShowSignup] = useState(false);
  const [organizerId, setOrganizerId] = useState('');
  const [organizerDraft, setOrganizerDraft] = useState('');
  const [attendees, setAttendees] = useState([]);
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('Discover');
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  const loadEvents = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    setError('');
    try { setEvents(await api.events()); }
    catch (cause) { setError(cause.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  const loadRegistrations = useCallback(async (id) => {
    if (!id) { setRegistered([]); return; }
    try { setRegistered(await api.registrations(id)); }
    catch (cause) { setToast(cause.message); }
  }, []);

  const loadDemoUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const users = await api.users();
      setDemoUsers(users);
      const savedId = getSavedUserId();
      const initialUser = users.find((user) => String(user.id) === savedId) || users[0];
      const initialId = initialUser ? String(initialUser.id) : '';
      setSelectedDemoUser((current) => current || initialId);
      if (initialId && initialId !== savedId) {
        setUserId(initialId);
        setUserDraft(initialId);
        try { window.localStorage.setItem('campuspulse-user-id', initialId); } catch { /* Demo selection remains active until refresh. */ }
      }
      setUsersError('');
      return users;
    } catch (cause) { setUsersError(cause.message); return []; }
    finally { setUsersLoading(false); }
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);
  useEffect(() => { loadDemoUsers(); }, [loadDemoUsers]);
  useEffect(() => { loadRegistrations(userId); }, [userId, loadRegistrations]);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const registeredIds = useMemo(() => new Set(registered.map((row) => String(row.event_id))), [registered]);
  const activeDemoUser = demoUsers.find((user) => String(user.id) === userId);
  const visibleEvents = useMemo(() => events.filter((event) => {
    const inTab = activeTab !== 'My tickets' || registeredIds.has(String(event.id));
    const inCategory = category === 'All' || classify(event.title) === category;
    const inSearch = `${event.title} ${event.id}`.toLowerCase().includes(search.toLowerCase());
    return inTab && inCategory && inSearch;
  }), [events, activeTab, registeredIds, category, search]);

  async function register(event) {
    if (!userId) {
      setToast(usersError || 'Choose a demo user from the header before registering.');
      return;
    }
    setBusy(String(event.id));
    try {
      await api.register(userId, String(event.id));
      await loadRegistrations(userId);
      const user = demoUsers.find((item) => String(item.id) === userId);
      setToast(`Registered ${user?.email || userId} for ${event.title}.`);
    } catch (cause) { setToast(cause.message); }
    finally { setBusy(''); }
  }

  function selectDemoUser(id) {
    setSelectedDemoUser(id);
    setUserId(id);
    setUserDraft(id);
    if (role === 'organizer') setOrganizerId(id);
    try { window.localStorage.setItem('campuspulse-user-id', id); } catch { /* Demo selection remains active until refresh. */ }
  }

  function selectDemoRole(nextRole) {
    setRole(nextRole);
    setOrganizerId(nextRole === 'organizer' ? userId : '');
  }

  async function registerSelectedDemoUser() {
    if (!selected || !selectedDemoUser) return;
    setBusy(String(selected.id));
    try {
      const user = demoUsers.find((item) => String(item.id) === selectedDemoUser);
      const id = String(user.id);
      try { window.localStorage.setItem('campuspulse-user-id', id); } catch { /* Session registration still works without storage. */ }
      setUserId(id);
      setUserDraft(id);
      await api.register(id, String(selected.id));
      await loadRegistrations(id);
      setSelected(null);
      setToast(`You’re on the list for ${selected.title}.`);
    } catch (cause) { setToast(cause.message); }
    finally { setBusy(''); }
  }

  async function fetchAttendees(event) {
    if (!organizerId) return setToast('Enter the organizer ID for this event to see its roster.');
    setBusy(`roster-${event.id}`);
    try {
      setAttendees(await api.attendees(String(event.id), organizerId));
      setSelected({ ...event, showRoster: true });
    } catch (cause) { setToast(cause.message); }
    finally { setBusy(''); }
  }

  const scrollToEvents = () => document.getElementById('events')?.scrollIntoView({ behavior: 'smooth' });
  const switchTab = (tab) => { setActiveTab(tab); setMobileOpen(false); scrollToEvents(); };

  return <div className="app-shell">
    <header className="topbar"><div className="nav-wrap">
      <a className="brand" href="#top" aria-label="CampusPulse home"><span className="brand-mark"><span /></span><span>campus<span className="brand-light">pulse</span><i>.</i></span></a>
      <nav className={`main-nav ${mobileOpen ? 'is-open' : ''}`} aria-label="Main navigation">
        {['Discover', 'My tickets', 'For organizers'].map((tab) => <button key={tab} onClick={() => tab === 'For organizers' ? (setActiveTab(tab), setMobileOpen(false), document.getElementById('organizer')?.scrollIntoView({ behavior: 'smooth' })) : switchTab(tab)} className={`nav-link ${activeTab === tab ? 'active' : ''}`}>{tab}{tab === 'My tickets' && registered.length > 0 && <span className="nav-count">{registered.length}</span>}</button>)}
      </nav>
      <div className="nav-right header-demo-controls"><label className="header-picker role-picker"><span>ROLE · DEMO ONLY</span><select aria-label="Choose demo role" value={role} onChange={(event) => selectDemoRole(event.target.value)}><option value="student">Student</option><option value="organizer">Organizer</option><option value="admin">Admin (demo)</option></select><ChevronDown size={13} /></label><label className="header-picker user-picker"><span>DATABASE USER · EMAIL / ID</span><select aria-label="Choose database user" value={selectedDemoUser} onChange={(event) => selectDemoUser(event.target.value)} disabled={usersLoading || demoUsers.length === 0}><option value="">{usersLoading ? 'Loading users…' : usersError ? 'Could not load users' : 'No users available'}</option>{demoUsers.map((user) => <option key={user.id} value={user.id}>{user.email} · {user.id}</option>)}</select><ChevronDown size={13} /></label><button className="menu-toggle" aria-label="Toggle menu" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X size={19} /> : <Menu size={19} />}</button></div>
    </div></header>

    <main id="top">
      <section className="hero"><div className="hero-inner">
        <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot" /> YOUR CAMPUS, OFF THE CLOCK</div>
          <h1>Good things<br />happen <span>on campus.</span></h1>
          <p className="hero-description">The best parts of college don’t happen in lecture. Find your people, try something new, and make a little noise.</p>
          <div className="hero-actions"><button className="button button-dark" onClick={scrollToEvents}>Find your thing <ArrowDown size={16} /></button><div className="friends-proof"><div className="face-stack"><span>J</span><span>A</span><span>M</span><span>+</span></div><span>Made for the <b>in-between</b></span></div></div>
          <div className="hero-footnote"><span><Sparkles size={14} /> A little less scrolling, a lot more living</span><span className="hero-scroll">SCROLL A LITTLE <ArrowDown size={13} /></span></div>
        </div>
        <div className="hero-art" aria-label="Students sharing a moment on campus"><div className="art-photo"><img src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=85" alt="Friends spending time together on campus" /><div className="photo-wash" /></div><div className="photo-sticker sticker-sparkle">✳</div><div className="photo-sticker sticker-smile">☺</div><div className="photo-note"><span className="note-top"><span className="note-live" /> GOOD PEOPLE. GOOD PLANS.</span><strong>That’s the<br />whole point.</strong><span className="note-bottom">go make a story <ArrowUpRight size={15} /></span></div><div className="floating-tag"><span className="floating-icon"><CalendarDays size={17} /></span><span><b>Something’s on</b><small>Take a look around →</small></span></div><div className="photo-caption">CAUGHT BETWEEN THE PLANS</div></div>
      </div><div className="hero-ribbon"><div className="ribbon-track">{Array.from({ length: 4 }, (_, i) => <span key={i}>YOUR PEOPLE ARE OUT THERE <i>✳</i> GO FIND THEM <i>✳</i></span>)}</div></div></section>

      <section className="events-section" id="events"><div className="section-shell">
        <div className="section-heading"><div><div className="eyebrow muted"><span className="small-star">✳</span> THE GOOD STUFF</div><h2>{activeTab === 'My tickets' ? <>Your <span>plans.</span></> : <>Out there, <span>happening.</span></>}</h2><p>Small plans turn into big stories. Start somewhere.</p></div><button className="text-link" onClick={() => loadEvents(true)} disabled={refreshing}>{refreshing ? 'Refreshing…' : 'See what’s new'} <ArrowUpRight size={16} /></button></div>
        <div className="events-controls"><div className="category-pills">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`category-pill ${category === item ? 'selected' : ''}`}>{item}</button>)}</div><label className="search-box"><Search size={16} /><input aria-label="Search events" placeholder="Find your kind of thing" value={search} onChange={(event) => setSearch(event.target.value)} />{search && <button aria-label="Clear search" onClick={() => setSearch('')}><X size={14} /></button>}</label></div>
        <div className="events-meta"><span>{activeTab === 'My tickets' ? 'YOUR RSVP LIST' : 'A FEW WORTH SHOWING UP FOR'}</span><span className="result-count">{visibleEvents.length} {visibleEvents.length === 1 ? 'event' : 'events'} <span>↗</span></span></div>
        {error && <div className="notice error-notice"><div><strong>Couldn’t load the campus calendar.</strong><span>{error}</span></div><button onClick={() => loadEvents()}>Try again <ArrowRight size={14} /></button></div>}
        {!error && loading ? <div className="event-grid">{[0, 1, 2].map((n) => <div className="skeleton" key={n}><div /><span /><span /></div>)}</div> : <div className="event-grid">
          {visibleEvents.map((event, index) => {
            const visual = art[index % art.length]; const ticketed = registeredIds.has(String(event.id));
            return <article className="event-card" key={event.id}>
              <button className={`event-visual ${visual.tone}`} onClick={() => setSelected(event)} aria-label={`View ${event.title}`}><img src={`https://images.unsplash.com/${visual.image}?auto=format&fit=crop&w=700&q=78`} alt="" loading="lazy" /><span className="image-tint" /><span className="event-category">{classify(event.title)}</span><span className="visual-glyph">{visual.emoji}</span><span className="visual-arrow"><ArrowUpRight size={18} /></span></button>
              <div className="event-info"><div className="event-date"><CalendarDays size={13} /> {prettyDate(event.date || event.starts_at)}</div><button className="event-title" onClick={() => setSelected(event)}>{event.title}</button><div className="event-meta-line"><span><MapPin size={13} /> {event.venue || 'Campus venue'}</span><span><Users size={13} /> {event.capacity ? `${event.capacity} spots` : 'All welcome'}</span></div>
                <div className="card-bottom"><span className="host-label"><span className="host-avatar">{initial(event.organizer_name || 'C')}</span>{event.organizer_name || 'Campus community'}</span><button className={`rsvp-button ${ticketed ? 'is-registered' : ''}`} onClick={() => ticketed ? setActiveTab('My tickets') : register(event)} disabled={busy === String(event.id)}>{ticketed ? <><Check size={14} /> You’re in</> : busy === String(event.id) ? 'Joining…' : <>I’m in <ArrowRight size={14} /></>}</button></div>
              </div>
            </article>;
          })}
        </div>}
        {!loading && !error && visibleEvents.length === 0 && <div className="empty-state"><span className="empty-icon"><Compass size={23} /></span><h3>{activeTab === 'My tickets' && !userId ? 'Your next story starts here.' : activeTab === 'My tickets' ? 'Nothing on the calendar yet.' : 'No plans found.'}</h3><p>{activeTab === 'My tickets' && !userId ? 'Add your campus ID below, then RSVP to an event to keep your tickets here.' : 'Try another filter or search for something different.'}</p>{activeTab === 'My tickets' && !userId && <button className="button button-dark" onClick={() => document.getElementById('identity')?.scrollIntoView({ behavior: 'smooth' })}>Set up your ID <ArrowRight size={15} /></button>}</div>}
      </div></section>

      <section className="join-strip"><div className="join-content"><div className="join-scribble">✳</div><div><span className="eyebrow">A NOTE FROM YOUR FUTURE SELF</span><h2>Remember when you<br />almost <em>stayed in?</em></h2></div><button className="join-button" onClick={scrollToEvents}>Make a plan <ArrowUpRight size={17} /></button><span className="join-decoration">✳</span></div></section>

      <section className="account-section" id="organizer"><div className="account-grid"><div className="account-copy"><div className="eyebrow muted"><ShieldCheck size={14} /> YOUR CAMPUS ACCOUNT</div><h2>Tickets in your<br /><span>back pocket.</span></h2><p>Set up with your existing campus user ID. Your RSVPs stay connected to your account.</p><div className="account-features"><span><Check size={14} /> Find your saved plans</span><span><Check size={14} /> RSVP in a couple clicks</span><span><Check size={14} /> No new password to remember</span></div></div>
        <div id="identity" className="account-card"><div className="account-card-top"><span className="account-icon"><GraduationCap size={18} /></span><span className="secure-label"><span /> DEMO MODE</span></div><strong className="active-demo-email">{activeDemoUser?.email || 'No demo user selected'}</strong><p className="form-hint">Choose the role and database user from the header. Registration actions use that selected user.</p>{userId && <div className="connected-account"><span><Check size={13} /></span> User ID <b>{userId}</b></div>}</div>
      </div></section>

      <section className="organizer-section"><div className="organizer-card"><div className="organizer-text"><span className="eyebrow"><Users size={14} /> HOST SOMETHING GOOD</span><h2>Making plans for<br /><em>everybody?</em></h2><p>Check your event’s RSVP list with the organizer ID linked to that event.</p></div><form className="organizer-form" onSubmit={(event) => { event.preventDefault(); setOrganizerId(organizerDraft.trim()); setToast('Organizer ID saved. Open an event to check its attendee list.'); }}><label htmlFor="organizer-id">Organizer ID</label><div className="organizer-input"><input id="organizer-id" value={organizerDraft} onChange={(event) => setOrganizerDraft(event.target.value)} placeholder="Your organizer ID" /><button type="submit" aria-label="Save organizer ID"><ArrowRight size={17} /></button></div><small>Your events will only show their roster when the ID matches the event owner.</small>{organizerId && <span className="organizer-saved"><Check size={13} /> ID ready</span>}</form></div></section>

    </main>
    <footer className="footer"><a className="brand footer-brand" href="#top"><span className="brand-mark"><span /></span><span>campus<span className="brand-light">pulse</span><i>.</i></span></a><span>Made for the moments between classes.</span><span className="footer-right">A LITTLE MORE <b>OUT THERE</b> <span>✳</span></span></footer>

    {selected && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}><section className="event-modal" role="dialog" aria-modal="true" aria-label={selected.showRoster ? 'Attendee roster' : selected.title}><button className="modal-close" onClick={() => { setSelected(null); setShowSignup(false); }} aria-label="Close"><X size={18} /></button><div className="modal-visual"><span>{selected.showRoster ? 'THE PEOPLE COMING' : classify(selected.title)}</span><span className="modal-star">✳</span></div><div className="modal-body">{selected.showRoster ? <><div className="eyebrow muted">ATTENDEE ROSTER</div><h2>People who are <em>in.</em></h2><p className="modal-description">{selected.title} · {attendees.length} {attendees.length === 1 ? 'attendee' : 'attendees'}</p>{attendees.length ? <div className="roster-list">{attendees.map((row) => <div key={row.id} className="roster-row"><span className="roster-avatar">{initial(row.users?.email || row.user_id)}</span><span><b>{row.users?.email || row.user_id}</b><small>Joined {prettyDate(row.created_at)}</small></span><Check size={15} /></div>)}</div> : <div className="roster-empty">No one has registered for this event yet.</div>}</> : showSignup ? <>
      <div className="eyebrow muted">DEMO ACCOUNT PICKER</div>
      <h2>Choose an attendee.</h2>
      <p className="modal-description">Select an existing backend user to RSVP for {selected.title}.</p>
      <div className="demo-select-wrap modal-select">
        <select aria-label="Choose demo account" value={selectedDemoUser} onFocus={() => { if (!demoUsers.length) loadDemoUsers(); }} onChange={(event) => setSelectedDemoUser(event.target.value)}>
          <option value="">{usersLoading ? 'Loading users…' : 'Choose a demo user'}</option>
          {demoUsers.map((user) => <option key={user.id} value={user.id}>{user.email} · {user.id}</option>)}
        </select><ChevronDown size={16} />
      </div>
      {usersError && <p className="picker-error">{usersError}</p>}
      <button className="button button-dark picker-submit" disabled={!selectedDemoUser || busy === String(selected.id) || usersLoading} onClick={registerSelectedDemoUser}>{busy === String(selected.id) ? 'Joining…' : <>Use user & RSVP <ArrowRight size={15} /></>}</button>
      <p className="picker-demo-note">Demo user selection only. No authentication is performed.</p>
      </> : <><div className="eyebrow muted">A PLAN WORTH MAKING</div><h2>{selected.title}</h2><div className="modal-meta"><span><CalendarDays size={15} />{prettyDate(selected.date || selected.starts_at)}</span><span><MapPin size={15} />{selected.venue || 'Campus venue'}</span><span><Users size={15} />{selected.capacity ? `${selected.capacity} spots` : 'Open to all'}</span></div><p className="modal-description">A campus gathering, made better when you’re there. Bring a friend or come find your people.</p><div className="modal-organizer">Hosted by <b>{selected.organizer_name || 'Campus community'}</b><span>·</span><span className="modal-event-id">{selected.id}</span></div><div className="modal-actions"><button className="button button-dark" onClick={() => register(selected)} disabled={busy === String(selected.id)}>{registeredIds.has(String(selected.id)) ? <><Check size={15} /> You’re on the list</> : busy === String(selected.id) ? 'Joining…' : <>Count me in <ArrowRight size={15} /></>}</button>{organizerId && <button className="button button-outline" onClick={() => fetchAttendees(selected)} disabled={busy === `roster-${selected.id}`}><Users size={15} />{busy === `roster-${selected.id}` ? 'Loading…' : 'See attendees'}</button>}</div></>}</div></section></div>}
    {toast && <div className="toast"><span><Check size={15} /></span>{toast}<button onClick={() => setToast('')} aria-label="Dismiss"><X size={15} /></button></div>}
  </div>;
}

export default App;
