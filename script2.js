
function showHome() {
  document.getElementById("heroSection").style.display = "";
  document.getElementById("ticker-wrap").style.display = "";
  document.getElementById("aboutSection").style.display = "";
  document.getElementById("processSection").style.display = "";
  document.getElementById("collageDetailsText").style.display = "";
  document.getElementById("collageTopDetailsText").style.display = "";
}

const slides = document.querySelectorAll('.bg-slide');
const dots   = document.querySelectorAll('.dot');
let cur = 0, timer;

function goSlide(n){
  slides[cur].classList.remove('active');
  dots[cur].classList.remove('active');
  cur = n;
  slides[cur].classList.add('active');
  dots[cur].classList.add('active');
  clearInterval(timer);
  timer = setInterval(nextSlide, 4800);
}
function nextSlide(){ goSlide((cur + 1) % slides.length) }
timer = setInterval(nextSlide, 4800);