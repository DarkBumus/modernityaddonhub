document.addEventListener("DOMContentLoaded", () => {
    const tabsContainer = document.getElementById("tabs");
    const versionContainer = document.getElementById("subtabs");
    const contentContainer = document.getElementById("content");

    let data = {};

    fetch("tab_containers.json") // Name deiner JSON-Datei
        .then(r => r.json())
        .then(json => {
            data = json;
            renderMainTabs();
        })
        .catch(err => console.error("Fehler beim Laden der JSON:", err));

    function renderMainTabs() {
        tabsContainer.innerHTML = "";

        Object.keys(data.packs)
            .filter(packName => data.packs[packName].visible)
            .forEach((packName, i) => {
                const tabEl = document.createElement("div");
                tabEl.className = "tab";
                tabEl.textContent = packName;

                if (i === 0) tabEl.classList.add("active");

                tabEl.addEventListener("click", () => {
                    tabsContainer.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
                    tabEl.classList.add("active");
                    renderVersionTabs(packName);
                });

                tabsContainer.appendChild(tabEl);
            });

        // Ersten Haupttab laden
        const firstPack = Object.keys(data.packs).find(k => data.packs[k].visible);
        renderVersionTabs(firstPack);
    }

    function renderVersionTabs(packName) {
        versionContainer.innerHTML = "";
        contentContainer.innerHTML = "";

        const pack = data.packs[packName];
        const versions = data.defaults.versions;

        versions.forEach((versionName, i) => {
            // Override prüfen
            const versionOverride = pack.versions?.[versionName] || {};
            const versionVisible = versionOverride.visible !== undefined ? versionOverride.visible : true;
            if (!versionVisible) return;

            const vTab = document.createElement("div");
            vTab.className = "tab";
            vTab.textContent = versionName;
            if (i === 0) vTab.classList.add("active");

            vTab.addEventListener("click", () => {
                versionContainer.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
                vTab.classList.add("active");
                renderPanels(packName, versionName);
            });

            versionContainer.appendChild(vTab);
        });

        // Ersten Versionstab laden
        const firstVersion = versions.find(v => {
            const vo = pack.versions?.[v] || {};
            return vo.visible !== false;
        });
        renderPanels(packName, firstVersion);
    }

    function renderPanels(packName, versionName) {
        contentContainer.innerHTML = "";

        const pack = data.packs[packName];
        const versionOverride = pack.versions?.[versionName] || {};

        data.defaults.category_panels.forEach(panelName => {
            const panelVisible = versionOverride.panels?.[panelName] !== undefined ? versionOverride.panels[panelName] : true;
            if (!panelVisible) return;

            const coll = document.createElement("button");
            coll.className = "collapsible";
            coll.textContent = panelName;

            const panel = document.createElement("div");
            panel.className = "content-panel";

            coll.addEventListener("click", () => {
                coll.classList.toggle("active");
                panel.style.maxHeight = panel.style.maxHeight ? null : panel.scrollHeight + "px";
            });

            contentContainer.appendChild(coll);
            contentContainer.appendChild(panel);
        });
    }
});
