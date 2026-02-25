import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  signOut,
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc,
  collection,
  getDocs,
  addDoc,
  updateDoc 
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// Get these from Firebase Console → Project Settings (gear) → Your apps → SDK setup
const firebaseConfig = {
  apiKey: "AIzaSyC6o3w7jGVqmnXhjlICsfSJfcfKtQu5rtM",
  authDomain: "unicircle-d0a14.firebaseapp.com",
  projectId: "unicircle-d0a14",
  storageBucket: "unicircle-d0a14.firebasestorage.app",
  messagingSenderId: "663187313490",
  appId: "1:663187313490:web:c8c1249b0c653742a7a08b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const STORAGE_KEY = "unicircle_user";

// Only these emails can access the Admin Panel. Add your admin email(s) here.
const ADMIN_EMAILS = [
  "edwinkjose98@gmail.com",
  "nikhilksiva70@gmail.com"
];

function saveUserToStorage(user) {
  if (!user) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      uid: user.uid,
      displayName: user.displayName || "",
      email: user.email || ""
    }));
  } catch (e) {
    console.warn("localStorage save failed", e);
  }
}

function clearUserFromStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn("localStorage clear failed", e);
  }
}

function isAdminEmail(email) {
  if (!email) return false;
  return ADMIN_EMAILS.some((e) => e.trim().toLowerCase() === String(email).trim().toLowerCase());
}

function updateAuthUI(loggedIn) {
  const authBtns = document.querySelectorAll(".nav-auth-buttons");
  const logoutBtns = document.querySelectorAll(".nav-logout-wrap");
  authBtns.forEach(el => { if (el) el.style.display = loggedIn ? "none" : "flex"; });
  logoutBtns.forEach(el => { if (el) el.style.display = loggedIn ? "flex" : "none"; });

  const userNameEls = document.querySelectorAll(".nav-user-name");
  const adminLinks = document.querySelectorAll(".nav-admin-link");
  let userData = null;
  if (loggedIn) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) userData = JSON.parse(raw);
    } catch (_) {}
  }
  const name = userData && (userData.displayName || userData.email) ? (userData.displayName || userData.email) : "";
  const email = userData && userData.email ? userData.email : "";
  userNameEls.forEach((el) => { if (el) { el.textContent = name ? `Hi, ${name}` : ""; el.style.display = name ? "" : "none"; } });
  adminLinks.forEach((el) => { if (el) el.style.display = isAdminEmail(email) ? "" : "none"; });
}

function logout() {
  document.getElementById("mainPage").style.display = "none";
  document.getElementById("login-div").style.display = "";
  signOut(auth).then(() => {
    clearUserFromStorage();
    updateAuthUI(false);
    const m = document.getElementById("mobMenu");
    if (m && m.classList.contains("open")) toggleMenu();
  }).catch((err) => {
    console.error("Logout error:", err);
    clearUserFromStorage();
    updateAuthUI(false);
  });
}

// Keep UI in sync with auth state (e.g. after refresh Firebase restores session)
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    clearUserFromStorage();
    updateAuthUI(false);
    return;
  }
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    saveUserToStorage(user);
    updateAuthUI(true);
  } else {
    clearUserFromStorage();
    updateAuthUI(false);
  }
});

window.logout = logout;

// Main page is shown first. Login/Sign up only when user clicks Log In or Sign Up in nav.
window.addEventListener("DOMContentLoaded", () => {

  const provider = new GoogleAuthProvider();

  const doGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      console.log(result);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        alert("Please Sign Up")
        openSignUp();
      } else {
        saveUserToStorage(user);
        updateAuthUI(true);
        alert("Welcome back " + user.displayName);
        openHome();
      }

    } catch (err) {
      console.error("Google login error:", err);
      const code = err.code || "";
      const msg = err.message || String(err);
      if (code === "auth/unauthorized-domain") {
        alert("Login failed: This domain is not allowed. Add it in Firebase Console → Authentication → Settings → Authorized domains (e.g. localhost).");
      } else if (code === "auth/popup-blocked") {
        alert("Login failed: Popup was blocked. Allow popups for this site or try again.");
      } else if (code === "auth/cancelled-popup-request" || code === "auth/popup-closed-by-user") {
        // User closed popup – no need to show error
        return;
      } else if (code === "auth/invalid-api-key" || (msg && msg.includes("api-key-not-valid"))) {
        alert("Login failed: Invalid Firebase API key. Replace the placeholder values in script.js with your real config from Firebase Console → Project Settings → Your apps.");
      } else {
        alert("Login failed: " + (msg || "Unknown error. Check console (F12) for details."));
      }
    }
  };

  const googleBtn = document.getElementById("googleLogin");
  if (googleBtn) googleBtn.onclick = doGoogleLogin;
  const googleBtnSignup = document.getElementById("googleLoginSignup");
  if (googleBtnSignup) googleBtnSignup.onclick = doGoogleLogin;

  // Sign-up form: create user doc in Firestore (user already signed in with Google) then show main page
  const signupSubmit = document.getElementById("signupSubmit");
  if (signupSubmit) {
    signupSubmit.onclick = async () => {
      const user = auth.currentUser;
      if (!user) {
        alert("Please sign in with Google first.");
        openLogin();
        return;
      }
      const get = (id) => (document.getElementById(id) && document.getElementById(id).value) || "";
      const userData = {
        displayName: get("signupName") || user.displayName || "",
        email: get("signupEmail") || user.email || "",
        phone: get("signupPhone"),
        parentName: get("signupParentName"),
        parentPhone: get("signupParentPhone"),
        district: get("signupDistrict"),
        place: get("signupPlace"),
        userType: get("signupUserType"),
        createdAt: new Date().toISOString()
      };
      try {
        await setDoc(doc(db, "users", user.uid), userData);
        saveUserToStorage(user);
        updateAuthUI(true);
        openHome();
      } catch (err) {
        console.error("Sign up error:", err);
        alert("Could not save profile. Try again.");
      }
    };
  }

  loadColleges();
});

// Default colleges used only for seeding Firebase (Admin panel → Seed default colleges)
// image: college photo URL (you can update links in Admin → Colleges → Edit)
const DEFAULT_COLLEGES = [
  { priority: 2, name: "IIT Delhi", loc: "New Delhi, Delhi", icon: "🏛️", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/IIT_Delhi_entrance_gate.jpg/800px-IIT_Delhi_entrance_gate.jpg", bg: "linear-gradient(135deg,#EEF2FF,#C7D2FE)", about: "The Indian Institute of Technology Delhi is one of India's most prestigious engineering and research institutions, founded in 1961. Ranked consistently among the top 5 universities in India by QS and NIRF, IIT Delhi is a global hub for scientific research, innovation, and entrepreneurship. With 500+ faculty members and 8,000+ students across 13 departments, it boasts one of Asia's strongest alumni networks.", campus: "Spread over 325 acres in New Delhi, IIT Delhi offers world-class infrastructure including 14 hostels, state-of-the-art research labs, a 24/7 library with 4 lakh+ volumes, a sports complex with a swimming pool, and a vibrant cultural center hosting 80+ student clubs — from robotics and AI to music and theatre.", place: "The 2024 season saw the highest domestic CTC of ₹1.7 crore per annum. Top recruiters: Google, Microsoft, Goldman Sachs, McKinsey, Apple, Meta. Over 95% of eligible students receive offers, with average domestic CTC of ₹28 LPA.", courses: [{ n: "B.Tech Computer Science", d: "4 Yrs · ₹8.5L/yr" }, { n: "B.Tech Electrical Engg.", d: "4 Yrs · ₹8.5L/yr" }, { n: "M.Tech AI & ML", d: "2 Yrs · ₹9L/yr" }, { n: "MBA (DMS)", d: "2 Yrs · ₹10L/yr" }, { n: "Ph.D Research Programs", d: "3–5 Yrs · Funded" }, { n: "B.Des Industrial Design", d: "4 Yrs · ₹8.5L/yr" }], info: [{ l: "Established", v: "1961" }, { l: "NIRF Ranking", v: "#2 Engineering" }, { l: "Annual Fees", v: "₹8.5 Lakhs" }, { l: "Admission", v: "JEE Advanced" }, { l: "Avg. CTC", v: "₹28 LPA" }, { l: "Students", v: "8,200+" }] },
  { priority: 1, name: "IIM Ahmedabad", loc: "Ahmedabad, Gujarat", icon: "💼", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/IIM_Ahmedabad_New_Campus.jpg/800px-IIM_Ahmedabad_New_Campus.jpg", bg: "linear-gradient(135deg,#FDF4FF,#E9D5FF)", about: "IIM Ahmedabad is Asia's most prestigious business school, globally ranked among the top 50 MBA programs. Founded in 1961 with collaboration from Harvard Business School, IIM-A has shaped India's corporate leadership for six decades. Its unique case study methodology and rigorous culture have produced Fortune 500 CEOs and leading policy makers.", campus: "IIM-A's campus, designed by architect Louis Kahn, is an architectural masterpiece spanning 102 acres. It features iconic brick buildings, modern research centers, a 400-seat amphitheater, executive residences, and one of India's finest business libraries with 3 lakh+ resources.", place: "The class of 2024 achieved an average CTC of ₹34.1 LPA with the highest international offer crossing ₹1.4 crore per annum. Top recruiters: McKinsey, BCG, Bain, Goldman Sachs, J.P. Morgan. 100% placement achieved consistently every year.", courses: [{ n: "Post Graduate Programme (MBA)", d: "2 Yrs · ₹32L total" }, { n: "PGPX – Executive MBA", d: "1 Yr · ₹36L total" }, { n: "PhD in Management", d: "4–6 Yrs · Stipend" }, { n: "Food & Agribusiness Mgmt.", d: "1 Yr · ₹20L total" }, { n: "ePost Graduate Programme", d: "2 Yrs · Online" }, { n: "Mgmt. Development Prog.", d: "Short · Varies" }], info: [{ l: "Established", v: "1961" }, { l: "FT Global Ranking", v: "Top 50 World" }, { l: "Program Fees", v: "₹32 Lakhs" }, { l: "CAT Cutoff", v: "99.7+ %ile" }, { l: "Avg. CTC", v: "₹34.1 LPA" }, { l: "Alumni", v: "42,000+" }] },
  { priority: 3, name: "BITS Pilani", loc: "Pilani, Rajasthan", icon: "🔬", image: "https://images.unsplash.com/photo-1562774053-701939374585?w=800", bg: "linear-gradient(135deg,#EFF6FF,#BFDBFE)", about: "BITS Pilani is India's top-ranked private engineering university, founded in 1964. BITS pioneered India's practice school model, giving students real-world industry experience from Year 3. With campuses in Pilani, Goa, Hyderabad, and Dubai, it serves 15,000+ students globally and has one of India's highest alumni-to-unicorn-founder ratios.", campus: "The 300-acre Pilani campus features cutting-edge labs, an astronomical observatory, a wind energy facility, and one of India's largest student sports complexes. Famous for OASIS (cultural), APOGEE (technical), and BOSM (sports) — among India's largest college festivals.", place: "BITS achieves 95%+ placement rates. The 2024 season averaged ₹22 LPA CTC with highest offers exceeding ₹1.5 crore. Unique Practice School internships at Siemens, TCS, and BARC from third year give students a major career head-start.", courses: [{ n: "B.E. Computer Science", d: "4 Yrs · ₹5.8L/yr" }, { n: "B.E. Electronics & Elec.", d: "4 Yrs · ₹5.8L/yr" }, { n: "B.Pharm + MBA (Dual)", d: "5 Yrs · ₹6L/yr" }, { n: "M.Sc. Mathematics", d: "5 Yrs Integrated" }, { n: "M.Tech Software Systems", d: "2 Yrs · ₹6.5L/yr" }, { n: "PhD Research Programs", d: "3–5 Yrs" }], info: [{ l: "Established", v: "1964" }, { l: "NIRF Ranking", v: "#23 Overall" }, { l: "Annual Fees", v: "₹5.8 Lakhs" }, { l: "Admission", v: "BITSAT Exam" }, { l: "Avg. CTC", v: "₹22 LPA" }, { l: "Campuses", v: "4 (India + Dubai)" }] },
  { priority: 4, name: "AIIMS New Delhi", loc: "New Delhi, Delhi", icon: "⚗️", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/AIIMS_New_Delhi_Overview.jpg/800px-AIIMS_New_Delhi_Overview.jpg", bg: "linear-gradient(135deg,#ECFDF5,#A7F3D0)", about: "AIIMS New Delhi is India's most revered medical institution and Asia's leading teaching hospital. Established in 1956 by an Act of Parliament, AIIMS is consistently ranked #1 in India's NIRF Medical Rankings. It is where India's most complex surgeries are performed, breakthrough medical research originates, and the finest doctors are trained.", campus: "The campus covers 80+ acres in Ansari Nagar, New Delhi, housing one of Asia's largest hospitals with 2,500+ beds, 42 clinical departments, and over 100 research labs. Includes modern hostels, a sports complex, and a dedicated trauma center — the first of its kind in India.", place: "AIIMS graduates are sought by top hospitals worldwide. MD/MS specialists command ₹15–30 LPA starting salaries in private hospitals. Senior positions range ₹50 lakh–₹2 crore annually. Many lead pioneering research institutes or establish nationally recognized practices.", courses: [{ n: "MBBS", d: "5.5 Yrs · Govt. Funded" }, { n: "B.Sc Nursing", d: "4 Yrs · ₹1.2L/yr" }, { n: "MD/MS Specializations", d: "3 Yrs · PG" }, { n: "DM/M.Ch Super-Specialty", d: "3 Yrs · Fellowship" }, { n: "Ph.D Biomedical Sciences", d: "3–5 Yrs · Stipend" }, { n: "B.Sc Medical Technology", d: "4 Yrs · ₹1L/yr" }], info: [{ l: "Established", v: "1956" }, { l: "NIRF Ranking", v: "#1 Medical" }, { l: "MBBS Fees", v: "Govt. Funded" }, { l: "Admission", v: "NEET-UG Top 50" }, { l: "Hospital Beds", v: "2,500+" }, { l: "Annual Patients", v: "35 Lakh+" }] },
  { priority: 5, name: "Ashoka University", loc: "Sonipat, Haryana", icon: "🌐", image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800", bg: "linear-gradient(135deg,#FFFBEB,#FDE68A)", about: "Ashoka University, founded in 2014, is India's fastest-growing liberal arts institution. Modeled on Ivy League education and South Asian intellectual tradition, Ashoka offers a unique multidisciplinary experience. With faculty from Oxford, Princeton, MIT, and Columbia, it brings world-class scholarship to India and offers need-blind admissions.", campus: "Ashoka's 25-acre fully residential campus in Sonipat features neo-modernist architecture, open-air amphitheaters, research centers, a maker's lab, recording studio, and a library with 1 lakh+ volumes. All students live on campus, creating a vibrant intellectual community.", place: "Graduates recruited by McKinsey, BCG, Goldman Sachs, Teach For India, and international grad schools (Oxford, Harvard). Average starting salary is ₹14 LPA, with many pursuing prestigious international programs.", courses: [{ n: "B.Sc Computer Science", d: "4 Yrs · ₹7.5L/yr" }, { n: "B.A. Economics", d: "4 Yrs · ₹7.5L/yr" }, { n: "B.A. PPE", d: "4 Yrs" }, { n: "Young India Fellowship", d: "1 Yr · PG" }, { n: "M.Sc Environmental Studies", d: "2 Yrs" }, { n: "Ph.D Programs", d: "4–5 Yrs · Stipend" }], info: [{ l: "Established", v: "2014" }, { l: "QS Asia Rank", v: "Top 200" }, { l: "Annual Fees", v: "₹7.5 Lakhs" }, { l: "Admission", v: "App + Interview" }, { l: "Int'l Faculty", v: "40%+" }, { l: "Need-Based Aid", v: "100% of need" }] },
  { priority: 6, name: "NID Ahmedabad", loc: "Ahmedabad, Gujarat", icon: "🎨", image: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800", bg: "linear-gradient(135deg,#FFF0F8,#FBCFE8)", about: "NID Ahmedabad is India's premier design institution and one of the world's top 10 design schools. Established in 1961 following recommendations by Charles and Ray Eames, NID has shaped Indian design for six decades. Graduates lead design at Apple, Google, IDEO, Tata, and major global design studios.", campus: "NID's 15-acre campus in Ahmedabad is a living design experiment. Specialized studios for textile, product, graphic, digital, film, and animation — alongside cutting-edge fabrication labs, 3D printing, and a design museum with 50,000+ artifacts.", place: "Placement rate consistently exceeds 90%. Top recruiters: Tata Design Studio, Mahindra Advanced Design, Amazon Lab126, Philips Design, IDEO. Freelance designers typically earn ₹20–50 LPA within five years of graduation.", courses: [{ n: "B.Des Product Design", d: "4 Yrs · ₹2.5L/yr" }, { n: "B.Des Communication Design", d: "4 Yrs · ₹2.5L/yr" }, { n: "B.Des Textile Design", d: "4 Yrs · ₹2.5L/yr" }, { n: "M.Des Interaction Design", d: "2.5 Yrs · ₹3L/yr" }, { n: "M.Des Transportation Design", d: "2.5 Yrs · ₹3L/yr" }, { n: "Ph.D Design Research", d: "3–5 Yrs" }], info: [{ l: "Established", v: "1961" }, { l: "Global Rank", v: "Top 10 Design" }, { l: "Annual Fees", v: "₹2.5 Lakhs" }, { l: "Admission", v: "NID DAT + Studio" }, { l: "Acceptance Rate", v: "~3%" }, { l: "Industry Partners", v: "200+" }] }
];

let collegesData = [];
let currentDisplayList = [];
let showAllColleges = false;

function getSortedColleges() {
  return [...collegesData].sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
}

function getFilteredColleges() {
  const sorted = getSortedColleges();
  const nameQ = (document.getElementById("filterCollegeName")?.value || "").trim().toLowerCase();
  const locQ = (document.getElementById("filterLocation")?.value || "").trim().toLowerCase();
  const courseQ = (document.getElementById("filterCourse")?.value || "").trim().toLowerCase();
  if (!nameQ && !locQ && !courseQ) return sorted;
  return sorted.filter((c) => {
    if (nameQ && !(c.name || "").toLowerCase().includes(nameQ)) return false;
    if (locQ && !(c.loc || "").toLowerCase().includes(locQ)) return false;
    if (courseQ) {
      const courses = Array.isArray(c.courses) ? c.courses : [];
      const match = courses.some((cr) => (cr.n || "").toLowerCase().includes(courseQ));
      if (!match) return false;
    }
    return true;
  });
}

async function loadColleges() {
  try {
    const snapshot = await getDocs(collection(db, "colleges"));
    collegesData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    const countEl = document.getElementById("collegesCountText");
    if (countEl) countEl.textContent = collegesData.length > 0 ? collegesData.length + "+" : "0";
    renderCollegesSection();
    return collegesData;
  } catch (err) {
    console.error("Load colleges error:", err);
    collegesData = [];
    currentDisplayList = [];
    renderCollegesSection();
    return [];
  }
}

function applyFilters() {
  if (!showAllColleges) return;
  renderCollegesSection();
}


function showAllCollegesView() {
  showAllColleges = true;
  const filterBar = document.getElementById("collegesFilterBar");
  const viewAllBtn = document.getElementById("viewAllCollegesBtn");
  if (filterBar) filterBar.style.display = "flex";
  if (viewAllBtn) viewAllBtn.style.display = "none";
  document.getElementById("heroSection").style.display = "none";
  document.getElementById("colleges").style.display = "";
  document.getElementById("ticker-wrap").style.display = "none";
  document.getElementById("aboutSection").style.display = "none";
  document.getElementById("processSection").style.display = "none";
  document.getElementById("collageDetailsText").style.display = "none";
  document.getElementById("collageTopDetailsText").style.display = "none";
  renderCollegesSection();
  goto("colleges");
}

function renderCollegesSection() {
  const grid = document.getElementById("collegesGrid");
  if (!grid) return;
  if (!collegesData.length) {
    grid.innerHTML = '<p class="colleges-empty">No colleges yet. Add some from Admin panel or seed default.</p>';
    currentDisplayList = [];
    return;
  }
  const list = showAllColleges ? getFilteredColleges() : getSortedColleges().slice(0, 9);
  currentDisplayList = list;
  if (list.length === 0) {
    grid.innerHTML = '<p class="colleges-empty">No colleges match the filters.</p>';
  } else {
    const delays = ["", " rd1", " rd2"];
    grid.innerHTML = list.map((c, idx) => {
      const rd = delays[idx % 3];
      const imgHtml = c.image
        ? `<img src="${escapeHtml(c.image)}" alt="${escapeHtml(c.name || "")}" class="col-card-img" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='block';" /><span class="col-card-fallback" style="display:none;font-size:3rem">${c.icon || "🏫"}</span>`
        : `<span style="font-size:3rem">${c.icon || "🏫"}</span>`;
      return `<div class="col-card rev${rd}" onclick="openCollege(${idx})">
        <div class="col-img" style="background:${c.bg || '#f0f0f0'}">${imgHtml}</div>
        <div class="col-body">
          <div class="col-name">${escapeHtml(c.name || "")}</div>
          <div class="col-loc">📍 ${escapeHtml(c.loc || "")}</div>
          <div class="col-foot"><button class="cbtn">View →</button></div>
        </div>
      </div>`;
    }).join("");
  }
  document.querySelectorAll(".col-grid .rev").forEach((el) => {
    if (typeof rObs !== "undefined" && rObs) rObs.observe(el);
  });
}

// ===== SPA ROUTING =====
function openCollege(idx) {
  const c = currentDisplayList[idx];
  if (!c) return;
  document.getElementById('d-nav-name').textContent = c.name;
  const dBg = document.getElementById('d-bg');
  const dImg = document.getElementById('d-college-image');
  dBg.style.background = c.bg || '#f0f0f0';
  if (c.image && dImg) {
    dImg.src = c.image;
    dImg.alt = c.name || '';
    dImg.style.display = '';
    dBg.style.display = 'none';
  } else {
    if (dImg) dImg.style.display = 'none';
    dBg.style.display = '';
    dBg.textContent = c.icon || '🏫';
    dBg.style.fontSize = '6rem';
  }
  document.getElementById('d-name').textContent = c.name;
  document.getElementById('d-loc').textContent = '📍 ' + (c.loc || '');
  document.getElementById('d-about').textContent = c.about || '';
  document.getElementById('d-campus').textContent = c.campus || '';
  document.getElementById('d-place').textContent = c.place || '';
  const courses = Array.isArray(c.courses) ? c.courses : [];
  document.getElementById('d-courses').innerHTML = courses.map(cr => `<div class="crs-item"><strong>${escapeHtml(cr.n)}</strong><span>${escapeHtml(cr.d)}</span></div>`).join('');
  const info = Array.isArray(c.info) ? c.info : [];
  document.getElementById('d-info').innerHTML = info.map(i => `<div class="dic"><div class="dic-l">${escapeHtml(i.l)}</div><div class="dic-v">${escapeHtml(i.v)}</div></div>`).join('');
  document.getElementById('home-page').style.display = 'none';
  document.getElementById('det-page').classList.add('active');
  window.scrollTo(0, 0);
}
function closeDetail(){
document.getElementById('det-page').classList.remove('active');
document.getElementById('home-page').style.display='block';
window.scrollTo(0,0);
}
function goto(id){const el=document.getElementById(id);if(el)el.scrollIntoView({behavior:'smooth'});}

// ===== MOBILE MENU =====
function toggleMenu(){
const h=document.getElementById('ham');
const m=document.getElementById('mobMenu');
h.classList.toggle('open');
m.classList.toggle('open');
}

// ===== NAV SCROLL =====
window.addEventListener('scroll',()=>{
document.getElementById('nav').classList.toggle('scrolled',window.scrollY>10);
});

// ===== COUNTERS =====
let counted=false;
function runCounters(){
if(counted)return;counted=true;
document.querySelectorAll('[data-target]').forEach(el=>{
    const t=+el.dataset.target,s=el.dataset.suf||'';
    let c=0,step=t/50;
    const tm=setInterval(()=>{c+=step;if(c>=t){c=t;clearInterval(tm);}el.textContent=Math.floor(c)+s;},20);
});
}
const cObs=new IntersectionObserver(e=>{if(e[0].isIntersecting)runCounters();},{threshold:.3});
const sr=document.querySelector('.stats-row');if(sr)cObs.observe(sr);

// ===== REVEAL ON SCROLL =====
const rObs=new IntersectionObserver(entries=>{
entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('vis');});
},{threshold:.12});
document.querySelectorAll('.rev').forEach(el=>rObs.observe(el));

// ===== HERO ENTRANCE =====
window.addEventListener('load',()=>{
    const items=['.hero-badge','.hero-tag','.hero-h1','.hero-sub','.hero-btns','.hero-cards','.stats-row','.app-download'];
    items.forEach((sel,i)=>{
        const el=document.querySelector(sel);
        if(!el)return;
        Object.assign(el.style,{opacity:'0',transform:'translateY(20px)',transition:'opacity .65s ease, transform .65s ease'});
        setTimeout(()=>{el.style.opacity='';el.style.transform='';},200+i*120);
    });
});

const desktopLinks = document.querySelectorAll(".nav-desktop a");
desktopLinks.forEach(link => {
    link.addEventListener("click", function () {
    desktopLinks.forEach(nav => nav.classList.remove("active"));
    this.classList.add("active");
    });
});

const mobileLinks = document.querySelectorAll(".mob-menu a");
mobileLinks.forEach(link => {
    link.addEventListener("click", function () {
    mobileLinks.forEach(nav => nav.classList.remove("active"));
    this.classList.add("active");
    document.getElementById("mobMenu").classList.remove("show");
    document.getElementById("ham").classList.remove("active");
    });
});

function openLogin() {
    document.getElementById("login-div").style.display = "";
    document.getElementById("signup-div").style.display = "none";
    document.getElementById("mainPage").style.display = "none";
}
function openSignUp() {
    document.getElementById("login-div").style.display = "none";
    document.getElementById("signup-div").style.display = "";
    document.getElementById("mainPage").style.display = "none";
    const user = auth.currentUser;
    if (user) {
      const nameEl = document.getElementById("signupName");
      const emailEl = document.getElementById("signupEmail");
      if (nameEl && !nameEl.value) nameEl.value = user.displayName || "";
      if (emailEl && !emailEl.value) emailEl.value = user.email || "";
    }
}
function openHome() {
    document.getElementById("login-div").style.display = "none";
    document.getElementById("signup-div").style.display = "none";
    const mainContent = document.getElementById("mainContent");
    const adminPanel = document.getElementById("adminPanel");
    if (mainContent) mainContent.style.display = "";
    if (adminPanel) adminPanel.style.display = "none";
    document.getElementById("mainPage").style.display = "";
}

async function openAdminPanel() {
  const user = auth.currentUser;
  if (!user || !isAdminEmail(user.email)) {
    alert("Access denied. Only allowed admin emails can open the Admin Panel.");
    return;
  }
  const mainContent = document.getElementById("mainContent");
  const adminPanel = document.getElementById("adminPanel");
  if (mainContent) mainContent.style.display = "none";
  if (adminPanel) adminPanel.style.display = "block";
  switchAdminTab("users");
  await loadAdminUsers();
}

function closeAdminPanel() {
  const mainContent = document.getElementById("mainContent");
  const adminPanel = document.getElementById("adminPanel");
  if (adminPanel) adminPanel.style.display = "none";
  if (mainContent) mainContent.style.display = "";
}

async function loadAdminUsers() {
  const tbody = document.getElementById("adminTableBody");
  const msgEl = document.getElementById("adminPanelMessage");
  if (!tbody || !msgEl) return;
  tbody.innerHTML = "";
  msgEl.textContent = "Loading...";
  msgEl.className = "admin-message";
  try {
    const snapshot = await getDocs(collection(db, "users"));
    const users = [];
    snapshot.forEach((d) => users.push({ id: d.id, ...d.data() }));
    msgEl.textContent = users.length ? "" : "No users yet.";
    if (users.length) msgEl.classList.add("admin-message-ok");
    users.forEach((u) => {
      const tr = document.createElement("tr");
      const date = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—";
      tr.innerHTML = `
        <td>${escapeHtml(u.displayName || "—")}</td>
        <td>${escapeHtml(u.email || "—")}</td>
        <td>${escapeHtml(u.phone || "—")}</td>
        <td>${escapeHtml(u.userType || "—")}</td>
        <td>${escapeHtml(u.district || "—")}</td>
        <td>${escapeHtml(u.place || "—")}</td>
        <td>${date}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    msgEl.textContent = "Error loading users. Check console.";
    msgEl.className = "admin-message admin-message-err";
  }
}

function escapeHtml(str) {
  if (str == null || str === "") return "—";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function switchAdminTab(tab) {
  document.querySelectorAll(".admin-tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === tab));
  const usersSec = document.getElementById("adminUsersSection");
  const collegesSec = document.getElementById("adminCollegesSection");
  const editForm = document.getElementById("adminCollegeEditForm");
  if (usersSec) usersSec.style.display = tab === "users" ? "block" : "none";
  if (collegesSec) collegesSec.style.display = tab === "colleges" ? "block" : "none";
  if (editForm) editForm.style.display = "none";
  if (tab === "colleges") loadAdminColleges();
}

async function seedDefaultColleges() {
  const msgEl = document.getElementById("adminCollegesMessage");
  if (msgEl) msgEl.textContent = "Seeding…";
  try {
    for (const c of DEFAULT_COLLEGES) {
      await addDoc(collection(db, "colleges"), c);
    }
    if (msgEl) msgEl.textContent = "Seeded " + DEFAULT_COLLEGES.length + " colleges.";
    await loadAdminColleges();
    await loadColleges();
  } catch (err) {
    console.error(err);
    if (msgEl) msgEl.textContent = "Error: " + (err.message || "seed failed");
  }
}

let adminCollegesList = [];

async function loadAdminColleges() {
  const tbody = document.getElementById("adminCollegesBody");
  const msgEl = document.getElementById("adminCollegesMessage");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (msgEl && !msgEl.textContent.startsWith("Seeded")) msgEl.textContent = "Loading…";
  try {
    const snapshot = await getDocs(collection(db, "colleges"));
    adminCollegesList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (msgEl && !msgEl.textContent.startsWith("Seeded")) msgEl.textContent = adminCollegesList.length + " colleges.";
    adminCollegesList.forEach((c) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(c.name || "—")}</td>
        <td>${escapeHtml(c.loc || "—")}</td>
        <td><button type="button" class="btn-nav btn-login" onclick="openCollegeEdit('${c.id}')">Edit</button></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    if (msgEl) msgEl.textContent = "Error loading colleges.";
  }
}

function openCollegeEdit(id) {
  const c = adminCollegesList.find((x) => x.id === id);
  if (!c) return;
  document.getElementById("editCollegeId").value = id;
  document.getElementById("editPriority").value = c.priority != null ? c.priority : "";
  document.getElementById("editName").value = c.name || "";
  document.getElementById("editLoc").value = c.loc || "";
  document.getElementById("editImage").value = c.image || "";
  document.getElementById("editIcon").value = c.icon || "";
  document.getElementById("editBg").value = c.bg || "";
  document.getElementById("editAbout").value = c.about || "";
  document.getElementById("editCampus").value = c.campus || "";
  document.getElementById("editPlace").value = c.place || "";
  document.getElementById("editCourses").value = JSON.stringify(c.courses || [], null, 2);
  document.getElementById("editInfo").value = JSON.stringify(c.info || [], null, 2);
  document.getElementById("adminCollegeEditForm").style.display = "block";
}

function cancelCollegeEdit() {
  document.getElementById("adminCollegeEditForm").style.display = "none";
}

async function saveCollegeEdit() {
  const id = document.getElementById("editCollegeId").value;

  let courses = [];
  let info = [];

  try {
    courses = JSON.parse(document.getElementById("editCourses").value || "[]");
  } catch (_) {
    alert("Invalid Courses JSON.");
    return;
  }

  try {
    info = JSON.parse(document.getElementById("editInfo").value || "[]");
  } catch (_) {
    alert("Invalid Info JSON.");
    return;
  }

  const priorityVal = document.getElementById("editPriority").value.trim();

  const data = {
    priority: priorityVal === "" ? null : parseInt(priorityVal, 10),
    name: document.getElementById("editName").value.trim(),
    loc: document.getElementById("editLoc").value.trim(),
    image: document.getElementById("editImage").value.trim(),
    icon: document.getElementById("editIcon").value.trim(),
    bg: document.getElementById("editBg").value.trim(),
    about: document.getElementById("editAbout").value.trim(),
    campus: document.getElementById("editCampus").value.trim(),
    place: document.getElementById("editPlace").value.trim(),
    courses,
    info
  };

  try {
    if (id) {
      // UPDATE EXISTING
      await updateDoc(doc(db, "colleges", id), data);
    } else {
      // ADD NEW
      await addDoc(collection(db, "colleges"), data);
    }

    document.getElementById("adminCollegeEditForm").style.display = "none";

    await loadAdminColleges();
    await loadColleges();

    const msgEl = document.getElementById("adminCollegesMessage");
    if (msgEl) msgEl.textContent = id ? "College updated." : "New college added.";

  } catch (err) {
    console.error(err);
    alert("Error saving: " + (err.message || err));
  }
}

function openAddCollege() {
  document.getElementById("editCollegeId").value = "";

  document.getElementById("editPriority").value = "";
  document.getElementById("editName").value = "";
  document.getElementById("editLoc").value = "";
  document.getElementById("editImage").value = "";
  document.getElementById("editIcon").value = "";
  document.getElementById("editBg").value = "";
  document.getElementById("editAbout").value = "";
  document.getElementById("editCampus").value = "";
  document.getElementById("editPlace").value = "";
  document.getElementById("editCourses").value = "[]";
  document.getElementById("editInfo").value = "[]";

  document.getElementById("adminCollegeEditForm").style.display = "block";
}

window.openAdminPanel = openAdminPanel;
window.closeAdminPanel = closeAdminPanel;
window.switchAdminTab = switchAdminTab;
window.seedDefaultColleges = seedDefaultColleges;
window.openCollegeEdit = openCollegeEdit;
window.cancelCollegeEdit = cancelCollegeEdit;
window.saveCollegeEdit = saveCollegeEdit;
window.openAddCollege = openAddCollege;

window.openLogin = openLogin;
window.openSignUp = openSignUp;
window.openHome = openHome;
window.openCollege = openCollege;
window.showAllCollegesView = showAllCollegesView;
window.applyFilters = applyFilters;
window.closeDetail = closeDetail;
window.goto = goto;
window.toggleMenu = toggleMenu;