document.addEventListener("DOMContentLoaded", () => {
    const tabsContainer = document.getElementById("tabs");
    const versionContainer = document.getElementById("subtabs");
    const contentContainer = document.getElementById("content");
    const previewContainer = document.getElementById("preview");

    let data = {};
    let downloadData = {};

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
            if (pack.visible === false) return false;
            if (pack.visible === true) return true;
            return packHasEntries(packName);
        });

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

        const firstPack = filteredPacks[0];
        if (firstPack) renderVersionTabs(firstPack);
        else {
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

        const visibleVersions = versions.filter(versionName => {
            const override = pack.versions?.[versionName];
            if (override?.visible === false) return false;
            if (override?.visible === true) return true;
            return versionHasEntries(packName, versionName);
        });

        visibleVersions.forEach((versionName, i) => {
            const vTab = document.createElement("div");
            vTab.className = "tab";

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

        const firstVersion = visibleVersions[0];
        if (firstVersion) renderPanels(packName, firstVersion);
        else contentContainer.innerHTML = "";
    }

    // -------------------------
    // PANELS
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

            contentContainer.appendChild(coll);
            contentContainer.appendChild(panel);

            if (data.defaults.auto_open_panels?.includes(panelName)) {
                coll.classList.add("active");
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

        const validTags = {
            "Template": "📦",
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

            const dlBtn = document.createElement("a");
            dlBtn.className = "download-btn";
            dlBtn.textContent = "Download";
            dlBtn.href = defaults.download_path + entry.file;
            dlBtn.download = entry.file.split("/").pop();

            // Panels zeigen nur Icon + Name + Download
            card.appendChild(icon);
            card.appendChild(title);
            card.appendChild(dlBtn);

// Vorschau-Hover
let previewInterval; // global, stoppt vorherige Intervalle

card.addEventListener("mouseenter", () => {
    if (previewInterval) {
        clearInterval(previewInterval);
        previewInterval = null;
    }

    previewContainer.innerHTML = "";

    const previews = entry.preview && entry.preview.length > 0 ? entry.preview : [entry.icon];
    let currentIndex = 0;

    // erstes Bild
    let imgCurrent = document.createElement("img");
    imgCurrent.src = defaults.preview_path + previews[currentIndex];
    imgCurrent.style.opacity = 1;
    imgCurrent.style.position = "absolute";
    imgCurrent.style.top = 0;
    imgCurrent.style.left = 0;
    imgCurrent.style.width = "100%";
    imgCurrent.style.height = "auto";
    imgCurrent.style.transition = "opacity 0.5s ease-in-out";
    previewContainer.appendChild(imgCurrent);

    // Container für Positionierung
    previewContainer.style.position = "relative";

    // Titel
    const titleEl = document.createElement("h3");
    titleEl.textContent = entry.name;
    titleEl.style.textAlign = "center";
    previewContainer.appendChild(titleEl);

    // Beschreibung
    const descEl = document.createElement("p");
    descEl.textContent = entry.description;
    descEl.style.textAlign = "left";
    descEl.style.marginTop = "10px";
    descEl.style.flex = "1";
    descEl.style.overflowY = "auto";
    previewContainer.appendChild(descEl);

    // Tags
    if (entry.tags && entry.tags.length > 0) {
        const tagDiv = document.createElement("div");
        tagDiv.className = "pack-tags";
        tagDiv.style.marginTop = "auto";
        entry.tags.filter(t => validTags[t]).forEach(tag => {
            const tagEl = document.createElement("span");
            tagEl.className = "pack-tag";
            tagEl.textContent = (validTags[tag] ? validTags[tag] + " " : "") + tag;
            tagDiv.appendChild(tagEl);
        });
        previewContainer.appendChild(tagDiv);
    }

    // mehrere Bilder
    if (previews.length > 1) {
        previewInterval = setInterval(() => {
            const nextIndex = (currentIndex + 1) % previews.length;

            const imgNext = document.createElement("img");
            imgNext.src = defaults.preview_path + previews[nextIndex];
            imgNext.style.opacity = 0;
            imgNext.style.position = "absolute";
            imgNext.style.top = 0;
            imgNext.style.left = 0;
            imgNext.style.width = "100%";
            imgNext.style.height = "auto";
            imgNext.style.transition = "opacity 0.5s ease-in-out";

            previewContainer.appendChild(imgNext);

            // Crossfade
            requestAnimationFrame(() => {
                imgNext.style.opacity = 1;
                imgCurrent.style.opacity = 0;
            });

            // altes Bild nach Fade entfernen
            setTimeout(() => {
                previewContainer.removeChild(imgCurrent);
                imgCurrent = imgNext;
                currentIndex = nextIndex;
            }, 500); // gleiche Dauer wie transition
        }, 3000); // alle 3 Sekunden
    }
});

            panelElement.appendChild(card);
        });
    }
});
