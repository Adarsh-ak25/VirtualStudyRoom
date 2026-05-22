const fadeItems = document.querySelectorAll(".fade-item");

const observer = new IntersectionObserver((entries) => {

  entries.forEach((entry) => {

    if(entry.isIntersecting){

      entry.target.classList.add("show");

    }

  });

});

fadeItems.forEach((item) => observer.observe(item));




const contactBtn = document.getElementById("contactBtn");

if(contactBtn){

  contactBtn.addEventListener("click", () => {

    alert("Thanks for visiting LofiStudy ☕");

  });

}