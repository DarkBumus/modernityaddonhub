document.addEventListener("DOMContentLoaded", () => {
    const tabsContainer = document.getElementById("tabs");
    const versionContainer = document.getElementById("subtabs");
    const contentContainer = document.getElementById("content");
    const previewContainer = document.getElementById("preview");

    let data = {};
    let downloadData = {};

let tagData = {}; // ganz oben definieren

Promise.all([
    fetch("tab_containers.json").then(r => r.json()),
    fetch("downloads.json").then(r => r.json()),
    fetch("tags.json").then(r => r.json()) // NEU
])
.then(([tabsJson, downloadsJson, tagsJson]) => {
    data = tabsJson;
    downloadData = downloadsJson;
    tagData = tagsJson; // NEU
    renderMainTabs();
})
    .catch(err => console.error("Fehler beim Laden der JSON:", err));

// -------------------------
// Mini-Markdown-Parser + Shorthand-System
// -------------------------
    
function formatDescription(text) {
    const container = document.createElement("div");
    if (!text) return container;

    // -----------------------------------
    // 1. Shorthands / Macros
    // -----------------------------------

    const macros = {

        //incompat[args]
        incompat: (arg) =>
            `<span style="color:#DD2E44;">This pack is <strong>incompatible</strong> with <u>${arg}</u>.</span>`,

        //overridemaster[args]
        overridemaster: (arg) =>
            `<span style="color:#FDCB58;">This pack <strong>overrides</strong> <u>${arg}</u>.</span>`,

        //overrideslave[args]
        overrideslave: (arg) =>
            `<span style="color:#FDCB58;">This pack <strong>gets overridden</strong> by <u>${arg}</u>.</span>`,

        //inspiration[args]
        inspiration: (arg) =>
            `(Inspiration drawn from ${arg}.)`,

        //requiresefr | kein arg für requiresefr
        requiresefr: () =>
            `(Keep in mind that some or all of this content requires <a href="https://modrinth.com/mod/etfuturum" target="_blank">Et Futurum Requiem</a> to be present.)`,

        //requiresmod[args]
        requiresmod: (arg) =>
            `(Keep in mind that some or all of this content requires ${arg} to be present.)`
    };

    // Ersetzt alle Vorkommen der Form name[arg]
    text = text.replace(
        /(\w+)\[(.*?)\]/g,
        (match, name, arg) => {
            if (macros[name]) return macros[name](arg);
            return match; // falls kein Macro vorhanden → nichts tun
        }
    );

    // Ersetzt requiresefr ohne Argumente
    text = text.replace(
        /\brequiresefr\b/g,
        () => macros.requiresefr()
    );

    // -----------------------------------
    // 2. Mini-Markdown
    // -----------------------------------

    // Neue Zeilen → <br>
    text = text.replace(/\r\n|\r|\n/g, "<br>");

    // Fett: **Text**
    text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // Kursiv: *Text*
    text = text.replace(/\*(.*?)\*/g, "<em>$1</em>");

    // Unterstrichen: __Text__
    text = text.replace(/__(.*?)__/g, "<u>$1</u>");

    // Durchgestrichen: ~~Text~~
    text = text.replace(/~~(.*?)~~/g, "<s>$1</s>");

    // Links: [Label](URL)
    text = text.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');

    // Farben: #RRGGBB{Text}
    text = text.replace(/#([0-9a-fA-F]{6})\{(.*?)\}/g, '<span style="color:#$1">$2</span>');

    // Schriftgröße: @XXpx{Text}
    text = text.replace(/@(\d+)px\{(.*?)\}/g, '<span style="font-size:$1px">$2</span>');

    // Code: `Text`
    text = text.replace(/`(.*?)`/g, "<code>$1</code>");

    container.innerHTML = text;
    return container;
}

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

            if (entry.external_downloads) {
                // Externer Link
                dlBtn.href = entry.external_downloads;
                dlBtn.target = "_blank";
                dlBtn.download = null; // nicht herunterladen, sondern öffnen
} else if (entry.file) {
    // Unterstützt einzelne Datei ODER Array
    if (Array.isArray(entry.file)) {
        dlBtn.href = "#";
        dlBtn.addEventListener("click", (e) => {
            e.preventDefault();

            entry.file.forEach(f => {
                const link = document.createElement("a");
                link.href = defaults.download_path + f;
                link.download = f.split("/").pop();
                link.style.display = "none";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
        });

    } else {
        // Einzelne Datei wie bisher
        dlBtn.href = defaults.download_path + entry.file;
        dlBtn.download = entry.file.split("/").pop();
    }
} else {
                // Weder file noch external_downloads → Button deaktivieren (optional)
                dlBtn.href = "#";
                dlBtn.classList.add("disabled");
            }

            // Panels zeigen nur Icon + Name + Download
            card.appendChild(icon);
            card.appendChild(title);
            card.appendChild(dlBtn);

// Vorschau-Hover
let previewInterval; // global, stoppt vorherige Intervalle

card.addEventListener("mouseenter", () => {
    // vorherigen Interval stoppen
    if (previewInterval) {
        clearInterval(previewInterval);
        previewInterval = null;
    }

    previewContainer.innerHTML = "";

    // Vorschaubilder oder Fallback auf Icon
    const previews = entry.preview && entry.preview.length > 0 ? entry.preview : [entry.icon];
    let currentIndex = 0;

    const img = document.createElement("img");
    img.src = defaults.preview_path + previews[currentIndex];
    img.style.opacity = 1;
    img.style.transition = "opacity 0.5s ease-in-out";
    previewContainer.appendChild(img);

    // Titel (zentriert)
    const titleEl = document.createElement("h3");
    titleEl.textContent = entry.name;
    previewContainer.appendChild(titleEl);

    // Beschreibung mit Mini-Markdown
    const descEl = formatDescription(entry.description);
    descEl.classList.add("preview-description");
    previewContainer.appendChild(descEl);

// Tags unten (aus tags.json)
if (entry.tags && entry.tags.length > 0) {
    const tagDiv = document.createElement("div");
    tagDiv.className = "pack-tags";
    tagDiv.style.marginTop = "auto";

    entry.tags.forEach(tagId => {
        const info = tagData[tagId];
        if (!info) return;

        const tagEl = document.createElement("span");
        tagEl.className = "pack-tag";
        tagEl.textContent = `${info.emoji} ${info.label}`;

        // Tooltip
        tagEl.addEventListener("mouseenter", e => showTagTooltip(e, info.description));
        tagEl.addEventListener("mousemove", e => moveTagTooltip(e));
        tagEl.addEventListener("mouseleave", hideTagTooltip);

        // Klickbare Tags (falls link != null)
        if (info.link) {
            tagEl.style.cursor = "pointer";
            tagEl.addEventListener("click", () => {
                window.open(info.link, "_blank");
            });
        }

        tagDiv.appendChild(tagEl);
    });

    previewContainer.appendChild(tagDiv);
}

function showTagTooltip(event, text) {
    const tip = document.getElementById("tag-tooltip");
    tip.textContent = text;
    tip.style.opacity = "1";
    moveTagTooltip(event);
}

function moveTagTooltip(event) {
    const tip = document.getElementById("tag-tooltip");

    const margin = 12; // Abstand zur Maus
    const mouseX = event.pageX;
    const mouseY = event.pageY;
    const tooltipWidth = tip.offsetWidth;
    const tooltipHeight = tip.offsetHeight;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Standardposition rechts unten
    let posX = mouseX + margin;
    let posY = mouseY + margin;

    // Rechts raus? → nach links verschieben
    if (posX + tooltipWidth > viewportWidth) {
        posX = mouseX - tooltipWidth - margin;
    }

    // Unten raus? → nach oben verschieben
    if (posY + tooltipHeight > viewportHeight) {
        posY = mouseY - tooltipHeight - margin;
    }

    // Falls oben raus → clamp nach 0
    if (posY < 0) posY = 0;

    // Falls links raus → clamp nach 0
    if (posX < 0) posX = 0;

    tip.style.left = posX + "px";
    tip.style.top = posY + "px";
}

function hideTagTooltip() {
    const tip = document.getElementById("tag-tooltip");
    tip.style.opacity = "0";
}

    // Intervall für mehrere Vorschaubilder
    if (previews.length > 1) {
        previewInterval = setInterval(() => {
            currentIndex = (currentIndex + 1) % previews.length;
            img.style.opacity = 0;
            setTimeout(() => {
                img.src = defaults.preview_path + previews[currentIndex];
                img.style.opacity = 1;
            }, 500); // sollte zur CSS-Transition passen
        }, 3000); // alle 3 Sekunden
    }
});

            panelElement.appendChild(card);
        });
    }
});

// Hamburger-Menü
const hamburgerBtn = document.getElementById("hamburger-btn");
const dropdown = document.getElementById("hamburger-dropdown");

hamburgerBtn.addEventListener("click", () => {
    dropdown.style.display = dropdown.style.display === "flex" ? "none" : "flex";
});

// Klick außerhalb schließt das Menü
document.addEventListener("click", (e) => {
    if (!hamburgerBtn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = "none";
    }
});

document.getElementById("year").textContent = new Date().getFullYear();
