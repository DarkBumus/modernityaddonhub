document.addEventListener("DOMContentLoaded", () => {
    const tabsContainer = document.getElementById("tabs");
    const versionContainer = document.getElementById("subtabs");
    const contentContainer = document.getElementById("content");
    const previewContainer = document.getElementById("preview");

    // MODE and TAB_JSON must be set on the page before including this script.
    // e.g. <script>const MODE="documentation"; const TAB_JSON="tab_containers_doku.json";</script>
    if (typeof MODE === "undefined" || typeof TAB_JSON === "undefined") {
        console.error("Bitte setze MODE und TAB_JSON vor dem Laden von script.js");
        return;
    }

    let data = {};
    let downloadData = {};
    let tagData = {};

    // Build fetch list depending on mode
    const fetches = [ fetch(TAB_JSON).then(r => r.json()) ];
    if (MODE === "normal") {
        fetches.push(fetch("downloads.json").then(r => r.json()));
        fetches.push(fetch("tags.json").then(r => r.json()));
    }

    Promise.all(fetches)
        .then(results => {
            data = results[0] || {};

            if (MODE === "normal") {
                downloadData = results[1] || {};
                tagData = results[2] || {};
            }

            renderMainTabs();
        })
        .catch(err => console.error("Fehler beim Laden der JSON:", err));

    // -------------------------
    // MAIN TABS
    // -------------------------
    function renderMainTabs() {
        tabsContainer.innerHTML = "";

        const filteredPacks = Object.keys(data.packs || {}).filter(packName => {
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
    // VERSION TABS
    // -------------------------
    function renderVersionTabs(packName) {
        versionContainer.innerHTML = "";
        contentContainer.innerHTML = "";

        const pack = data.packs?.[packName] || {};
        const versions = data.defaults?.versions || [];

        // show versions depending on overrides or availability
        const visibleVersions = versions.filter(versionName => {
            const override = pack.versions?.[versionName];
            if (override?.visible === false) return false;
            if (override?.visible === true) return true;
            return versionHasEntries(packName, versionName);
        });

        visibleVersions.forEach((versionName, i) => {
            const vTab = document.createElement("div");
            vTab.className = "tab";

            const emoji = data.defaults?.version_emojis?.[versionName] || "";
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
    // PANELS / DOCUMENTATION DISPLAY
    // -------------------------
    function renderPanels(packName, versionName) {
        // If in documentation mode: try to read HTML block with id "doc-VERSION" or "doc-VERSION_WITH_UNDERSCORES"
        if (MODE === "documentation") {
            const idWithDot = `doc-${versionName}`;            // e.g. doc-1.7
            const idWithUnderscore = `doc-${versionName.replace(/\./g,"_")}`; // doc-1_7
            const docEl = document.getElementById(idWithDot) || document.getElementById(idWithUnderscore);

            if (docEl) {
                // copy innerHTML from hidden doc block
                contentContainer.innerHTML = `<div class="documentation-block">${docEl.innerHTML}</div>`;
            } else {
                // fallback placeholder
                contentContainer.innerHTML = `
                    <div class="documentation-block">
                        <h2>Documentation for version ${versionName}</h2>
                        <p>No documentation found for this version yet.</p>
                    </div>`;
            }
            return;
        }

        // Normal mode: render the collapsible panels as before
        contentContainer.innerHTML = "";

        const pack = data.packs[packName];
        const versionOverride = pack?.versions?.[versionName] || {};

        (data.defaults?.category_panels || []).forEach(panelName => {
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

            if (data.defaults?.auto_open_panels?.includes(panelName)) {
                coll.classList.add("active");
                panel.style.maxHeight = panel.scrollHeight + "px";
            }
        });
    }

    // -------------------------
    // ENTRY CHECK HELPERS
    // -------------------------
    function packHasEntries(packName) {
        if (MODE === "documentation") return true; // always show packs in documentation mode
        const pack = downloadData[packName];
        if (!pack) return false;
        return Object.values(pack).some(version => Object.values(version).some(entries => entries?.length > 0));
    }

    function versionHasEntries(packName, versionName) {
        if (MODE === "documentation") return true; // always show versions in documentation mode
        const version = downloadData[packName]?.[versionName];
        if (!version) return false;
        return Object.values(version).some(entries => entries?.length > 0);
    }

    function panelHasEntries(packName, versionName, panelName) {
        if (MODE === "documentation") return true; // not used in documentation but keep consistent
        const entries = downloadData[packName]?.[versionName]?.[panelName];
        return entries && entries.length > 0;
    }

    // -------------------------
    // CREATE ENTRY CARDS (normal mode)
    // -------------------------
    function insertDownloadEntries(panelElement, packName, versionName, panelName) {
        const defaults = downloadData.defaults || {};
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
            icon.src = (defaults.icon_path || "") + entry.icon;

            const title = document.createElement("h3");
            title.textContent = entry.name;

            const dlBtn = document.createElement("a");
            dlBtn.className = "download-btn";
            dlBtn.textContent = "Download";
            dlBtn.href = (defaults.download_path || "") + entry.file;
            dlBtn.download = entry.file?.split("/").pop() || "";

            card.appendChild(icon);
            card.appendChild(title);
            card.appendChild(dlBtn);

            // Preview hover (keeps scope-local interval)
            let previewInterval;
            card.addEventListener("mouseenter", () => {
                if (previewInterval) { clearInterval(previewInterval); previewInterval = null; }

                previewContainer.innerHTML = "";

                const previews = entry.preview?.length > 0 ? entry.preview : [entry.icon];
                let currentIndex = 0;

                const img = document.createElement("img");
                img.src = (defaults.preview_path || defaults.icon_path || "") + previews[currentIndex];
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

                if (previews.length > 1) {
                    previewInterval = setInterval(() => {
                        currentIndex = (currentIndex + 1) % previews.length;
                        img.style.opacity = 0;
                        setTimeout(() => {
                            img.src = (defaults.preview_path || defaults.icon_path || "") + previews[currentIndex];
                            img.style.opacity = 1;
                        }, 500);
                    }, 5000);
                }
            });

            panelElement.appendChild(card);
        });
    }

    // -------------------------
    // TOOLTIP LOGIC
    // -------------------------
    function showTagTooltip(event, text) {
        const tip = document.getElementById("tag-tooltip");
        if (!tip) return;
        tip.textContent = text;
        tip.style.opacity = "1";
        moveTagTooltip(event);
    }

    function moveTagTooltip(event) {
        const tip = document.getElementById("tag-tooltip");
        if (!tip) return;

        const margin = 12;
        const mouseX = event.pageX;
        const mouseY = event.pageY;
        const tooltipWidth = tip.offsetWidth;
        const tooltipHeight = tip.offsetHeight;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let posX = mouseX + margin;
        let posY = mouseY + margin;

        if (posX + tooltipWidth > viewportWidth) posX = mouseX - tooltipWidth - margin;
        if (posY + tooltipHeight > viewportHeight) posY = mouseY - tooltipHeight - margin;
        if (posY < 0) posY = 0;
        if (posX < 0) posX = 0;

        tip.style.left = posX + "px";
        tip.style.top = posY + "px";
    }

    function hideTagTooltip() {
        const tip = document.getElementById("tag-tooltip");
        if (!tip) return;
        tip.style.opacity = "0";
    }

    // -------------------------
    // HAMBURGER (safe init — only if elements exist)
    // -------------------------
    const hamburgerBtn = document.getElementById("hamburger-btn");
    const dropdown = document.getElementById("hamburger-dropdown");
    if (hamburgerBtn && dropdown) {
        hamburgerBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            dropdown.style.display = dropdown.style.display === "flex" ? "none" : "flex";
        });
        document.addEventListener("click", (e) => {
            if (!hamburgerBtn.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = "none";
            }
        });
    }
});
