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

    // 1. Alle Pack-Namen filtern (AUTO-HIDE + visible-Flags berücksichtigen)
    const filteredPacks = Object.keys(data.packs).filter(packName => {

        const pack = data.packs[packName];

        // Wenn visible explizit false ist → immer verstecken
        if (pack.visible === false) return false;

        // Wenn visible true ist → immer anzeigen
        if (pack.visible === true) return true;

        // Sonst: Auto-hide, wenn keine Downloads existieren
        return packHasEntries(packName);
    });

    // 2. Tabs für gefilterte Packs erzeugen
    filteredPacks.forEach((packName, i) => {
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

    // 3. Schriftlich: ERSTER SICHTBARER Pack aus der gefilterten Liste
    const firstPack = filteredPacks[0];

    // 4. Wenn es einen gibt, Versionen rendern
    if (firstPack) {
        renderVersionTabs(firstPack);
    } else {
        // Wenn gar kein Pack sichtbar ist (unlikely), UI leeren
        versionContainer.innerHTML = "";
        contentContainer.innerHTML = "";
    }
}

    // -------------------------
    // VERSIONEN
    // -------------------------

function renderVersionTabs(packName) {
    versionContainer.innerHTML = "";
    contentContainer.innerHTML = "";

    const pack = data.packs[packName];
    const versions = data.defaults.versions;

    versions
        .filter(versionName => {
            const override = pack.versions?.[versionName];

            // explizit versteckt?
            if (override?.visible === false) return false;

            // explizit sichtbar?
            if (override?.visible === true) return true;

            // Sonst auto-hide anhand der Downloads:
            return versionHasEntries(packName, versionName);
        })
        .forEach((versionName, i) => {
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
        const override = pack.versions?.[v];
        if (override?.visible === false) return false;
        if (override?.visible === true) return true;
        return versionHasEntries(packName, v);
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
                    : panelHasEntries(packName, versionName, panelName);

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

    function packHasEntries(packName) {
    const pack = downloadData[packName];
    if (!pack) return false;

    return Object.values(pack).some(version =>
        Object.values(version).some(entries => entries?.length > 0)
    );
}

function versionHasEntries(packName, versionName) {
    const version = downloadData[packName]?.[versionName];
    if (!version) return false;

    return Object.values(version).some(entries => entries?.length > 0);
}

function panelHasEntries(packName, versionName, panelName) {
    const entries = downloadData[packName]?.[versionName]?.[panelName];
    return entries && entries.length > 0;
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
