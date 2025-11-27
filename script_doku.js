document.addEventListener("DOMContentLoaded", () => {
    const tabsContainer = document.getElementById("tabs");
    const sections = document.querySelectorAll(".doc-section");

    fetch("tab_containers_doku.json")
        .then(r => r.json())
        .then(data => renderTabs(data.tabs))
        .catch(err => console.error("JSON-Fehler:", err));

    function renderTabs(tabs) {
        tabsContainer.innerHTML = "";

        tabs
            .filter(t => t.visible !== false)
            .forEach((tab, index) => {
                const tabEl = document.createElement("div");
                tabEl.className = "tab";
                tabEl.textContent = (tab.emoji ? tab.emoji + " " : "") + tab.label;

                if (index === 0) {
                    tabEl.classList.add("active");
                    showSection(tab.id);
                }

                tabEl.addEventListener("click", () => {
                    tabsContainer.querySelectorAll(".tab")
                        .forEach(t => t.classList.remove("active"));

                    tabEl.classList.add("active");
                    showSection(tab.id);
                });

                tabsContainer.appendChild(tabEl);
            });
    }

    function showSection(id) {
        sections.forEach(sec => {
            sec.style.display = sec.id === id ? "block" : "none";
        });
    }

    // Hamburger Menü (identisch wie im Hauptscript)
    const hamburgerBtn = document.getElementById("hamburger-btn");
    const dropdown = document.getElementById("hamburger-dropdown");

    hamburgerBtn.addEventListener("click", () => {
        dropdown.style.display = dropdown.style.display === "flex" ? "none" : "flex";
    });

    document.addEventListener("click", e => {
        if (!hamburgerBtn.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = "none";
        }
    });
});
