
document.addEventListener("DOMContentLoaded", function() {
  const path = window.location.pathname.replace(/\\/g, "/");
  const inRaces = /\/races(?:\/|$)/.test(path);

  const root = inRaces ? "../" : "";
  const races = inRaces ? "" : "races/";

  const raceLinks = [
    { href: races + "Nains.html", label: "Nains" },
    { href: races + "Elfe.html", label: "Elfes" },
    { href: races + "Humain.html", label: "Humains" },
    { href: races + "Hobbit.html", label: "Hobbits" },
    { href: races + "Gnome.html", label: "Gnomes" },
    { href: races + "Demi_Elfe.html", label: "Demi-Elfes" },
    { href: races + "Demi_Orc.html", label: "Demi-Orcs" },
    { href: races + "Changelin.html", label: "Changelins" },
    { href: races + "Drakeide.html", label: "Drakeides" },
    { href: races + "Féral.html", label: "Féraux" },
    { href: races + "Forgelier.html", label: "Forgeliers" },
    { href: races + "Kalashtar.html", label: "Kalashtars" },
  ];

  const links = [
    { href: root + "index.html", label: "Accueil" },
    { href: root + "fiche.html", label: "Fiche" },
    { href: root + "maisons_draconiques.html", label: "Maisons" },
    { href: root + "Marques_draconiques.html", label: "Marques" },
    { href: root + "Dons.html", label: "Dons" },
    { href: root + "Liens_Ideaux.html", label: "Liens & Idéaux" },
  ];

  const raceMenuHTML =
    '<div class="nav-dropdown">' +
    '<button type="button" class="nav-dropdown-toggle" aria-expanded="false">Races</button>' +
    '<div class="nav-dropdown-menu">' +
    raceLinks.map(function(l) {
      return '<a href="' + l.href + '">' + l.label + "</a>";
    }).join("") +
    "</div>" +
    "</div>";

  const navHTML =
    '<nav class="main-nav">\n' +
    '  <a href="' + links[0].href + '">' + links[0].label + "</a>\n" +
    '  <a href="' + links[1].href + '">' + links[1].label + "</a>\n" +
    "  " + raceMenuHTML + "\n" +
    links.slice(2).map(function(l) {
      return '  <a href="' + l.href + '">' + l.label + "</a>";
    }).join("\n") +
    "\n</nav>";

  const container = document.getElementById("nav-container");
  if (container) {
    container.innerHTML = navHTML;

    const dropdown = container.querySelector(".nav-dropdown");
    const toggle = container.querySelector(".nav-dropdown-toggle");
    if (dropdown && toggle) {
      toggle.addEventListener("click", function(e) {
        e.stopPropagation();
        const isOpen = dropdown.classList.toggle("open");
        toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      });
      document.addEventListener("click", function(e) {
        if (!dropdown.contains(e.target)) {
          dropdown.classList.remove("open");
          toggle.setAttribute("aria-expanded", "false");
        }
      });
      document.addEventListener("keydown", function(e) {
        if (e.key === "Escape") {
          dropdown.classList.remove("open");
          toggle.setAttribute("aria-expanded", "false");
        }
      });
    }
  }

  import("./" + root + "auth.js").then(function(auth) {
    return auth.getCurrentUser().then(function(user) {
      return auth.isMJ(user);
    });
  }).then(function(userIsMJ) {
    if (!userIsMJ || !container) return;
    const nav = container.querySelector(".main-nav");
    if (!nav || nav.querySelector('a[href="' + root + 'mj.html"]')) return;
    const link = document.createElement("a");
    link.href = root + "mj.html";
    link.textContent = "Maître du Jeu";
    nav.appendChild(link);
  }).catch(function() {});
});
