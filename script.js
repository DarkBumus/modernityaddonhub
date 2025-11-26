document.addEventListener("DOMContentLoaded", () => {
    const tabsContainer = document.getElementById("tabs");
    const versionContainer = document.getElementById("subtabs");
    const contentContainer = document.getElementById("content");

    let data = {};          // Für tab_containers.json
    let downloadData = {};  // Für downloads.json

    // Beide JSONs laden
    Promise.all([
        fetch("tab_containers.json").then(r => r.json()),
        fetch("downloads.json").then(r => r.json())
    ])
        .then(([tabsJson, downloadsJson]) => {
            data = tabsJson;
            downloadData = downloadsJson;
            renderMainTabs();
        })
        .catch(err => console.error("Fehler beim Laden der JSON:", err));

    // -------------------------
    // TABS
    // -------------------------

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

        const firstPack = Object.keys(data.packs).find(k => data.packs[k].visible);
        renderVersionTabs(firstPack);
    }

    // -------------------------
    // VERSIONEN
    // -------------------------

    function renderVersionTabs(packName) {
        versionContainer.innerHTML = "";
        contentContainer.innerHTML = "";

        const pack = data.packs[packName];
        const versions = data.defaults.versions;

        versions.forEach((versionName, i) => {
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

        const firstVersion = versions.find(v => {
            const vo = pack.versions?.[v] || {};
            return vo.visible !== false;
        });

        renderPanels(packName, firstVersion);
    }

    // -------------------------
    // PANELS (Collapsibles)
    // -------------------------

    function renderPanels(packName, versionName) {
        contentContainer.innerHTML = "";

        const pack = data.packs[packName];
        const versionOverride = pack.versions?.[versionName] || {};

        data.defaults.category_panels.forEach(panelName => {
            const panelVisible =
                versionOverride.panels?.[panelName] !== undefined
                    ? versionOverride.panels[panelName]
                    : true;

            if (!panelVisible) return;

            const coll = document.createElement("button");
            coll.className = "collapsible";
            coll.textContent = panelName;

            const panel = document.createElement("div");
            panel.className = "content-panel";

            // *** HIER fügen wir die Packs ein ***
            insertDownloadEntries(panel, packName, versionName, panelName);

            coll.addEventListener("click", () => {
                coll.classList.toggle("active");
                panel.style.maxHeight = panel.style.maxHeight ? null : panel.scrollHeight + "px";
            });

            contentContainer.appendChild(coll);
            contentContainer.appendChild(panel);
        });
    }

    // -------------------------
    // PACK DOWNLOAD-EINTRÄGE
    // -------------------------

    function insertDownloadEntries(panelElement, packName, versionName, panelName) {

        const defaults = downloadData.defaults;

        const packGroup = downloadData[packName];
        if (!packGroup) return;

        const versionGroup = packGroup[versionName];
        if (!versionGroup) return;

        const entries = versionGroup[panelName];
        if (!entries || entries.length === 0) return;

        entries.forEach(entry => {

            const card = document.createElement("div");
            card.className = "pack-card";

            const icon = document.createElement("img");
            icon.className = "pack-icon";
            icon.src = defaults.iconPath + entry.icon;

            const title = document.createElement("h3");
            title.textContent = entry.name;

            const desc = document.createElement("p");
            desc.textContent = entry.description;

            const dlBtn = document.createElement("a");
            dlBtn.className = "download-btn";
            dlBtn.textContent = "Download";
            dlBtn.href = defaults.downloadPath + entry.file;
            dlBtn.download = entry.file.split("/").pop();

            card.appendChild(icon);
            card.appendChild(title);
            card.appendChild(desc);
            card.appendChild(dlBtn);

            panelElement.appendChild(card);
        });
    }
});
