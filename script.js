document.addEventListener("DOMContentLoaded", () => {
    const tabsContainer = document.getElementById("tabs");
    const versionContainer = document.getElementById("subtabs");
    const contentContainer = document.getElementById("content");
    const previewContainer = document.getElementById("preview");

    let data = {};
    let downloadData = {};
    let tagData = {};

    let fetches = [fetch(TAB_JSON).then(r => r.json())];

    if (MODE === "normal") {
        fetches.push(fetch("downloads.json").then(r => r.json()));
        fetches.push(fetch("tags.json").then(r => r.json()));
    }

    Promise.all(fetches)
        .then(results => {
            data = results[0];

            if (MODE === "normal") {
                downloadData = results[1];
                tagData = results[2];
            }

            renderMainTabs();
        })
        .catch(err => console.error("Fehler beim Laden der JSON:", err));

    // -------------------------------------------------------
    // MAIN TABS
    // -------------------------------------------------------
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

    // -------------------------------------------------------
    // VERSION TABS
    // -------------------------------------------------------
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

    // -------------------------------------------------------
    // PANELS
    // -------------------------------------------------------
    function renderPanels(packName, versionName) {
        // Documentation Mode: Nur Textblock anzeigen
        if (MODE === "documentation") {
            contentContainer.innerHTML = `
                <div class="documentation-block">
                    <h2>Documentation for version ${versionName}</h2>
                    <p>Here will be the documentation content…</p>
                </div>
            `;
            return;
        }

        contentContainer.innerHTML = "";

        const pack = data.packs[packName];
        const versionOverride = pack.versions?.[versionName] || {};

        data.defaults.category_panels.forEach(panelName => {
            const panelVisible =
                versionOverride.panels?.[panelName] !== undefined
                    ? versionOverride.panels[panelName]
                    : panelHasEntries(packName, versionName, panelName);

            if (!panelVisible) return;

            // Panel Button
            const coll = document.createElement("button");
            coll.className = "collapsible";
            coll.textContent = panelName;

            // Panel Content
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

    // -------------------------------------------------------
    // ENTRY CHECK HELPERS
    // -------------------------------------------------------
function packHasEntries(packName) {
    if (MODE === "documentation") return true;
    const pack = downloadData[packName];
    if (!pack) return false;

    return Object.values(pack).some(version =>
        Object.values(version).some(entries => entries?.length > 0)
    );
}

function versionHasEntries(packName, versionName) {
    if (MODE === "documentation") return true;
    const version = downloadData[packName]?.[versionName];
    if (!version) return false;

    return Object.values(version).some(entries => entries?.length > 0);
}

function panelHasEntries(packName, versionName, panelName) {
    if (MODE === "documentation") return true;
    const entries = downloadData[packName]?.[versionName]?.[panelName];
    return entries && entries.length > 0;
}

    // -------------------------------------------------------
    // CREATE ENTRY CARDS
    // -------------------------------------------------------
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
            dlBtn.href = defaults.download_path + entry.file;
            dlBtn.download = entry.file.split("/").pop();

            card.appendChild(icon);
            card.appendChild(title);
            card.appendChild(dlBtn);

            // -----------------------------
            // Preview Hover
            // -----------------------------
            let previewInterval;

            card.addEventListener("mouseenter", () => {
                if (previewInterval) {
                    clearInterval(previewInterval);
                    previewInterval = null;
                }

                previewContainer.innerHTML = "";

                const previews = entry.preview?.length > 0 ? entry.preview : [entry.icon];
                let currentIndex = 0;

                const img = document.createElement("img");
                img.src = defaults.preview_path + previews[currentIndex];
                img.style.opacity = 1;
                img.style.transition = "opacity 0.5s ease-in-out";

                previewContainer.appendChild(img);

                const titleEl = document.createElement("h3");
                titleEl.textContent = entry.name;
                titleEl.style.textAlign = "center";

                previewContainer.appendChild(titleEl);

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

                    entry.tags.forEach(tagId => {
                        const info = tagData[tagId];
                        if (!info) return;

                        const tagEl = document.createElement("span");
                        tagEl.className = "pack-tag";
                        tagEl.textContent = `${info.emoji} ${info.label}`;

                        tagEl.addEventListener("mouseenter", e => showTagTooltip(e, info.description));
                        tagEl.addEventListener("mousemove", e => moveTagTooltip(e));
                        tagEl.addEventListener("mouseleave", hideTagTooltip);

                        if (info.link) {
                            tagEl.style.cursor = "pointer";
                            tagEl.addEventListener("click", () => window.open(info.link, "_blank"));
                        }

                        tagDiv.appendChild(tagEl);
                    });

                    previewContainer.appendChild(tagDiv);
                }

                // Auto-rotate previews
                if (previews.length > 1) {
                    previewInterval = setInterval(() => {
                        currentIndex = (currentIndex + 1) % previews.length;
                        img.style.opacity = 0;

                        setTimeout(() => {
                            img.src = defaults.preview_path + previews[currentIndex];
                            img.style.opacity = 1;
                        }, 500);
                    }, 5000);
                }
            });

            panelElement.appendChild(card);
        });
    }

    // -------------------------------------------------------
    // TOOLTIP LOGIC
    // -------------------------------------------------------
    function showTagTooltip(event, text) {
        const tip = document.getElementById("tag-tooltip");
        tip.textContent = text;
        tip.style.opacity = "1";
        moveTagTooltip(event);
    }

    function moveTagTooltip(event) {
        const tip = document.getElementById("tag-tooltip");

        const margin = 12;
        const mouseX = event.pageX;
        const mouseY = event.pageY;

        const tooltipWidth = tip.offsetWidth;
        const tooltipHeight = tip.offsetHeight;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let posX = mouseX + margin;
        let posY = mouseY + margin;

        if (posX + tooltipWidth > viewportWidth) {
            posX = mouseX - tooltipWidth - margin;
        }

        if (posY + tooltipHeight > viewportHeight) {
            posY = mouseY - tooltipHeight - margin;
        }

        if (posY < 0) posY = 0;
        if (posX < 0) posX = 0;

        tip.style.left = posX + "px";
        tip.style.top = posY + "px";
    }

    function hideTagTooltip() {
        const tip = document.getElementById("tag-tooltip");
        tip.style.opacity = "0";
    }
});

// -------------------------------------------------------
// HAMBURGER MENU
// -------------------------------------------------------
const hamburgerBtn = document.getElementById("hamburger-btn");
const dropdown = document.getElementById("hamburger-dropdown");

hamburgerBtn.addEventListener("click", () => {
    dropdown.style.display = dropdown.style.display === "flex" ? "none" : "flex";
});

document.addEventListener("click", (e) => {
    if (!hamburgerBtn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = "none";
    }
});
