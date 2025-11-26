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

    const filteredPacks = Object.keys(data.packs).filter(packName => {
        const pack = data.packs[packName];

        // Explizit unsichtbar → verstecken
        if (pack.visible === false) return false;

        // Explizit sichtbar → immer anzeigen
        if (pack.visible === true) return true;

        // Kein Flag → Auto-Hide nach Downloads
        return packHasEntries(packName);
    });

    // Tabs erzeugen
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

    // Erstes sichtbares Pack rendern
    const firstPack = filteredPacks[0];
    if (firstPack) {
        renderVersionTabs(firstPack);
    } else {
        versionContainer.innerHTML = "";
        contentContainer.innerHTML = "";
    }
}

    // -------------------------
    // VERSIONS
    // -------------------------

function renderVersionTabs(packName) {
    versionContainer.innerHTML = "";
    contentContainer.innerHTML = "";

    const pack = data.packs[packName];
    const versions = data.defaults.versions;

    // Filtere die Versions-Tabs basierend auf sichtbar/unsichtbar oder Auto-Hide
    const visibleVersions = versions.filter(versionName => {
        const override = pack.versions?.[versionName];

        if (override?.visible === false) return false; // explizit versteckt
        if (override?.visible === true) return true;   // explizit sichtbar
        return versionHasEntries(packName, versionName); // Auto-Hide
    });

    // Erzeuge die Tabs
    visibleVersions.forEach((versionName, i) => {
        const vTab = document.createElement("div");
        vTab.className = "tab";

        // Emoji aus defaults.version_emojis
        const emoji = data.defaults.version_emojis?.[versionName] || "";
        vTab.textContent = (emoji ? emoji + " " : "") + versionName;

        if (i === 0) vTab.classList.add("active");

        vTab.addEventListener("click", () => {
            versionContainer.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
            vTab.classList.add("active");
            renderPanels(packName, versionName);
        });

        versionContainer.appendChild(vTab);
    });

    // Erstes sichtbares Version-Tab rendern
    const firstVersion = visibleVersions[0];
    if (firstVersion) {
        renderPanels(packName, firstVersion);
    } else {
        contentContainer.innerHTML = ""; // Keine Version sichtbar
    }
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

        insertDownloadEntries(panel, packName, versionName, panelName);

        coll.addEventListener("click", () => {
            coll.classList.toggle("active");
            panel.style.maxHeight = panel.style.maxHeight ? null : panel.scrollHeight + "px";
        });

        // Panels zuerst ans DOM hängen
        contentContainer.appendChild(coll);
        contentContainer.appendChild(panel);

        // Auto-open aus defaults.auto_open_panels
        if (data.defaults.auto_open_panels?.includes(panelName)) {
            coll.classList.add("active");
            // maxHeight erst nach dem Anhängen setzen
            panel.style.maxHeight = panel.scrollHeight + "px";
        }
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
    // PACK DOWNLOAD-ENTRIES
    // -------------------------

function insertDownloadEntries(panelElement, packName, versionName, panelName) {
    const defaults = downloadData.defaults;

    // Valid Tags und ihre Emojis
    const validTags = {
        "Requires Right Proper MCPatcher": "🩹",
        "OptiFine-compatible": "🔎",
        "OptiFine-incompatible": "⚠️",
        "Vanilla-compatbile": "🍦",
        "Interpolated": "🧩",
        "Complete Connection": "🖼️",
        "Horizontal Connection": "🚥",
        "Vertical Connection": "🚦",
        "2-Side Rotation": "2️⃣",
        "4-Side Rotation": "4️⃣",
        "Mixed Rotation": "🔢",
        "Requires MineTweaker/CraftTweaker": "🔁",
        "Includes Script": "📜",
        "Includes Mod": "🛠️"
        // Hier weitere Tags hinzufügen
    };

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
        icon.src = defaults.icon_path + entry.icon;

        const title = document.createElement("h3");
        title.textContent = entry.name;

        const desc = document.createElement("p");
        desc.textContent = entry.description;

        const dlBtn = document.createElement("a");
        dlBtn.className = "download-btn";
        dlBtn.textContent = "Download";
        dlBtn.href = defaults.download_path + entry.file;
        dlBtn.download = entry.file.split("/").pop();

        card.appendChild(icon);
        card.appendChild(title);
        card.appendChild(desc);
        card.appendChild(dlBtn);

        // -------------------------
        // Tags einfügen
        // -------------------------
        if (entry.tags && entry.tags.length > 0) {
            const tagContainer = document.createElement("div");
            tagContainer.className = "tag-container";

            entry.tags
                .filter(tag => validTags.hasOwnProperty(tag))
                .forEach(tag => {
                    const tagEl = document.createElement("span");
                    tagEl.className = "tag-pill";
                    tagEl.textContent = (validTags[tag] ? validTags[tag] + " " : "") + tag;
                    tagContainer.appendChild(tagEl);
                });

            card.appendChild(tagContainer);
        }

        panelElement.appendChild(card);
    });
}
});
