document.addEventListener("DOMContentLoaded", () => {
    const tabsContainer = document.getElementById("tabs");
    const subtabsContainer = document.getElementById("subtabs");

    let subtabsData = {};

    // Zuerst: Untertabs laden
    fetch("versions_tabs.json")
        .then(response => response.json())
        .then(data => {
            subtabsData = data;
        })
        .then(() => {
            // Dann: Haupttabs laden
            return fetch("packs_tabs.json");
        })
        .then(response => response.json())
        .then(data => {
            renderMainTabs(data.tabs);
        })
        .catch(err => console.error("Fehler:", err));

    function renderMainTabs(tabs) {
        tabsContainer.innerHTML = "";
        
        tabs
            .filter(t => t.visible)
            .forEach((tab, index) => {
                const tabEl = document.createElement("div");
                tabEl.className = "tab";
                tabEl.textContent = tab.name;

                // Ersten Tab automatisch aktiv machen
                if (index === 0) {
                    tabEl.classList.add("active");
                    renderSubTabs(tab.name);
                }

                tabEl.addEventListener("click", () => {
                    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
                    tabEl.classList.add("active");

                    renderSubTabs(tab.name);
                });

                tabsContainer.appendChild(tabEl);
            });
    }

    function renderSubTabs(mainTabName) {
        subtabsContainer.innerHTML = "";

        const subtabs = subtabsData[mainTabName];
        if (!subtabs) return;

        subtabs
            .filter(st => st.visible)
            .forEach(st => {
                const stEl = document.createElement("div");
                stEl.className = "tab";
                stEl.textContent = st.name;

                subtabsContainer.appendChild(stEl);
            });
    }
});
