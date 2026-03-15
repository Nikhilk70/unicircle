
  function showHome() {
    const ids = [
      "heroSection",
      "ticker-wrap",
      "aboutSection",
      "processSection1",
      "collageDetailsText",
      "collageTopDetailsText"
    ];

    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = "";
    });

    const colleges = document.getElementById("colleges");
    if (colleges) colleges.style.display = "none";
  }

  const slides = document.querySelectorAll('.bg-slide');
  const dots   = document.querySelectorAll('.dot');
  let cur = 0, timer;

  function goSlide(n){
    if (!slides.length || !dots.length) return;  // guard added
    slides[cur].classList.remove('active');
    dots[cur].classList.remove('active');
    cur = n;
    slides[cur].classList.add('active');
    dots[cur].classList.add('active');
    clearInterval(timer);
    timer = setInterval(nextSlide, 4800);
  }
  function nextSlide(){ goSlide((cur + 1) % slides.length) }

  // Only start the timer if slides actually exist
  if (slides.length) timer = setInterval(nextSlide, 4800);
  timer = setInterval(nextSlide, 4800);

  function toggleFilter(){
      const filter = document.getElementById("collegesFilterBar");
      const overlay = document.getElementById("filterOverlay");

      filter.classList.toggle("active");
      overlay.style.display = "block";
  }

  function closeFilter(){
      const filter = document.getElementById("collegesFilterBar");
      const overlay = document.getElementById("filterOverlay");

      filter.classList.remove("active");
      overlay.style.display = "none";
  }

