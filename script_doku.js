document.addEventListener("DOMContentLoaded", () => {
    const tabsContainer = document.getElementById("tabs");
    const sections = document.querySelectorAll(".doc-section");

    fetch("tab_containers_doku.json")
        .then(r => r.json())
        .then(data => renderTabs(data.tabs))
        .catch(err => console.error("JSON-Fehler:", err));

    function renderTabs(tabs) {
    tabsContainer.innerHTML = "";

    tabs.forEach((tab, index) => {
        if (tab.visible === false) return;  // <- unsichtbare Tabs überspringen

        const t = document.createElement("div");
        t.className = "tab";

        // Emoji + Label sauber trennen
        if (tab.emoji) {
            const emojiSpan = document.createElement("span");
            emojiSpan.textContent = tab.emoji;
            t.appendChild(emojiSpan);
        }

        const labelSpan = document.createElement("span");
        labelSpan.textContent = tab.label;
        t.appendChild(labelSpan);

        if (tabsContainer.children.length === 0) {
            t.classList.add("active");
            showSection(tab.id);
        }

        t.addEventListener("click", () => {
            document.querySelectorAll("#tabs .tab").forEach(x => x.classList.remove("active"));
            t.classList.add("active");
            showSection(tab.id);
        });

        tabsContainer.appendChild(t);
    });
}

    function showSection(id) {
        sections.forEach(sec => {
            sec.style.display = sec.id === id ? "block" : "none";
        });
    }



    // Hamburger Menü identisch wie auf Startseite
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
