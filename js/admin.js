// js/admin.js

let currentPortfolioData = null;
let activeEditSection = null;

const editableSections = {
    profile: {
        title: 'Edit Profile',
        type: 'profile'
    },
    contact: {
        title: 'Edit Contact',
        type: 'fields',
        fields: [
            { key: 'intro', label: 'Intro', multiline: true },
            { key: 'availability', label: 'Availability', multiline: false }
        ]
    },
    education: {
        title: 'Edit Education',
        type: 'json'
    },
    skills: {
        title: 'Edit Skills',
        type: 'skills'
    },
    projects: {
        title: 'Manage Projects',
        type: 'projects'
    }
};

function cloneData(value) {
    return JSON.parse(JSON.stringify(value));
}

function getFormElement(name) {
    const form = document.getElementById('dynamicEditForm');
    return form?.elements?.[name] || null;
}

function showAdminError(message) {
    alert(message);
}

function updateAdminStatus(message, isError = false) {
    const status = document.getElementById('githubImportStatus');
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('error-text', Boolean(isError));
}

/**
 * Handles the login form submission.
 */
async function handleAdminLogin(event) {
    event.preventDefault();

    const patInput = document.getElementById('githubPat');
    const errorDisplay = document.getElementById('loginError');
    const token = patInput.value.trim();

    if (!token) {
        errorDisplay.textContent = 'Enter a GitHub token to continue.';
        errorDisplay.hidden = false;
        return;
    }

    sessionStorage.setItem('adminAuth', '1');
    sessionStorage.setItem('githubPat', token);

    try {
        if (typeof validateGitHubAccess === 'function') {
            await validateGitHubAccess();
        }
    } catch (error) {
        sessionStorage.removeItem('adminAuth');
        sessionStorage.removeItem('githubPat');
        errorDisplay.textContent = error.message || 'GitHub authentication failed.';
        errorDisplay.hidden = false;
        return;
    }

    errorDisplay.hidden = true;
    enableAdminMode();
}

/**
 * Toggles the UI into admin mode, hiding the login modal and showing edit buttons.
 */
function enableAdminMode() {
    const loginModal = document.getElementById('loginModal');
    const adminDashboard = document.getElementById('adminDashboard');

    if (loginModal) loginModal.hidden = true;
    if (adminDashboard) adminDashboard.hidden = false;

    document.body.classList.add('admin-mode');

    if (!document.getElementById('adminBanner')) {
        const banner = document.createElement('div');
        banner.id = 'adminBanner';
        banner.className = 'admin-banner';
        banner.textContent = 'ADMIN MODE - Changes save directly to GitHub';
        document.body.prepend(banner);
    }

    injectSharedModal();
    bindEditButtons();
    bindProjectTileEditing();
}

/**
 * Checks if the user is already authenticated on page load.
 */
function checkExistingSession() {
    const isAuthenticated = sessionStorage.getItem('adminAuth') === '1'
        && Boolean(sessionStorage.getItem('githubPat'));

    if (isAuthenticated) {
        enableAdminMode();
    }
}

/**
 * Injects the shared modal component into the DOM.
 */
function injectSharedModal() {
    if (document.getElementById('editModal')) return;

    const modal = document.createElement('div');
    modal.id = 'editModal';
    modal.className = 'modal-overlay';
    modal.style.display = 'none';

    const content = document.createElement('div');
    content.className = 'modal-content surface-2-bg';

    const title = document.createElement('h2');
    title.id = 'modalTitle';
    title.className = 'espresso-text section-title';
    title.textContent = 'Edit Section';

    const form = document.createElement('form');
    form.id = 'dynamicEditForm';
    form.addEventListener('submit', event => {
        event.preventDefault();
        commitChanges();
    });

    const actions = document.createElement('div');
    actions.className = 'action-buttons';

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'btn btn-secondary';
    cancelButton.textContent = 'Cancel';
    cancelButton.addEventListener('click', closeEditModal);

    const saveButton = document.createElement('button');
    saveButton.type = 'submit';
    saveButton.className = 'btn btn-primary';
    saveButton.textContent = 'Save to GitHub';

    actions.append(cancelButton, saveButton);
    content.append(title, form, actions);
    modal.appendChild(content);
    document.body.appendChild(modal);
}

function createAdminToolButton(text, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-secondary compact-btn';
    button.textContent = text;
    button.addEventListener('click', onClick);
    return button;
}

function createInputGroup({ id, labelText, name, value, multiline = false, required = true }) {
    const group = document.createElement('div');
    group.className = 'form-group';

    const label = document.createElement('label');
    label.className = 'brown-text';
    label.htmlFor = id;
    label.textContent = labelText;

    const input = document.createElement(multiline ? 'textarea' : 'input');
    input.id = id;
    input.name = name;
    input.className = 'form-input';
    input.required = required;
    input.value = value || '';

    group.append(label, input);
    return group;
}

function bindEditButtons() {
    document.querySelectorAll('.edit-btn[data-edit-section]').forEach(button => {
        if (button.dataset.bound === 'true') return;

        button.dataset.bound = 'true';
        button.addEventListener('click', () => {
            openEditModal(button.dataset.editSection);
        });
    });
}

function bindProjectTileEditing() {
    document.querySelectorAll('#projectsGallery .project-tile').forEach(tile => {
        if (tile.dataset.adminBound === 'true') return;

        tile.dataset.adminBound = 'true';
        tile.classList.add('admin-editable-tile');
        tile.addEventListener('click', event => {
            if (!document.body.classList.contains('admin-mode')) return;
            if (event.target.closest('a')) return;

            event.preventDefault();
            event.stopPropagation();

            const projectId = tile.dataset.projectId;
            openProjectTileEditor(projectId);
        });
    });
}

function observeProjectGalleryForAdminEditing() {
    const gallery = document.getElementById('projectsGallery');
    if (!gallery || gallery.dataset.adminObserver === 'true') return;

    gallery.dataset.adminObserver = 'true';

    if (typeof MutationObserver === 'function') {
        const observer = new MutationObserver(() => {
            bindProjectTileEditing();
        });

        observer.observe(gallery, { childList: true, subtree: true });
    }

    // Fallback for environments without MutationObserver support.
    window.setTimeout(bindProjectTileEditing, 600);
}

async function ensurePortfolioDataLoaded() {
    if (!currentPortfolioData) {
        currentPortfolioData = await fetchPortfolioData();
    }

    if (!currentPortfolioData) {
        throw new Error('Portfolio data could not be loaded.');
    }
}

async function openEditModal(sectionName) {
    const sectionConfig = editableSections[sectionName];
    if (!sectionConfig) return;

    try {
        await ensurePortfolioDataLoaded();
    } catch (error) {
        console.error(error);
        showAdminError('Unable to load portfolio data for editing.');
        return;
    }

    activeEditSection = sectionName;

    const modal = document.getElementById('editModal');
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('dynamicEditForm');

    title.textContent = sectionConfig.title;
    form.replaceChildren();

    if (sectionConfig.type === 'fields') {
        sectionConfig.fields.forEach(fieldConfig => {
            form.appendChild(createInputGroup({
                id: `edit-${fieldConfig.key}`,
                labelText: fieldConfig.label,
                name: fieldConfig.key,
                multiline: fieldConfig.multiline,
                value: currentPortfolioData[sectionName]?.[fieldConfig.key] || ''
            }));
        });
    } else if (sectionConfig.type === 'profile') {
        renderProfileEditor(form);
    } else if (sectionConfig.type === 'skills') {
        renderSkillsEditor(form);
    } else if (sectionConfig.type === 'projects') {
        renderProjectManager(form);
    } else {
        const group = document.createElement('div');
        group.className = 'form-group';

        const label = document.createElement('label');
        label.className = 'brown-text';
        label.htmlFor = 'edit-json';
        label.textContent = `${sectionConfig.title.replace('Edit ', '')} JSON`;

        const textarea = document.createElement('textarea');
        textarea.id = 'edit-json';
        textarea.name = 'json';
        textarea.className = 'form-input code-input';
        textarea.required = true;
        textarea.value = JSON.stringify(currentPortfolioData[sectionName], null, 2);

        group.append(label, textarea);
        form.appendChild(group);
    }

    modal.style.display = 'flex';
}

function renderProfileEditor(form) {
    const profile = currentPortfolioData.profile || {};

    form.appendChild(createInputGroup({
        id: 'edit-profile-name',
        labelText: 'Name',
        name: 'profile_name',
        value: profile.name || ''
    }));
    form.appendChild(createInputGroup({
        id: 'edit-profile-title',
        labelText: 'Title',
        name: 'profile_title',
        value: profile.title || ''
    }));
    form.appendChild(createInputGroup({
        id: 'edit-profile-tagline',
        labelText: 'Tagline',
        name: 'profile_tagline',
        value: profile.tagline || ''
    }));
    form.appendChild(createInputGroup({
        id: 'edit-profile-summary',
        labelText: 'Summary',
        name: 'profile_summary',
        multiline: true,
        value: profile.summary || ''
    }));
    form.appendChild(createInputGroup({
        id: 'edit-profile-location',
        labelText: 'Location',
        name: 'profile_location',
        value: profile.location || ''
    }));
    form.appendChild(createInputGroup({
        id: 'edit-profile-email',
        labelText: 'Email',
        name: 'profile_email',
        value: profile.email || ''
    }));
    form.appendChild(createInputGroup({
        id: 'edit-profile-github',
        labelText: 'GitHub URL',
        name: 'profile_github',
        value: profile.github || ''
    }));
    form.appendChild(createInputGroup({
        id: 'edit-profile-linkedin',
        labelText: 'LinkedIn URL',
        name: 'profile_linkedin',
        value: profile.linkedin || ''
    }));

    const photoGroup = document.createElement('div');
    photoGroup.className = 'form-group';

    const photoLabel = document.createElement('label');
    photoLabel.className = 'brown-text';
    photoLabel.htmlFor = 'edit-profile-photo-file';
    photoLabel.textContent = 'Profile Photo';

    const photoCurrent = document.createElement('p');
    photoCurrent.className = 'muted-text';
    photoCurrent.textContent = `Current path: ${profile.photo || 'Not set'}`;

    const photoInput = document.createElement('input');
    photoInput.type = 'file';
    photoInput.id = 'edit-profile-photo-file';
    photoInput.name = 'profile_photo_file';
    photoInput.accept = 'image/png,image/jpeg,image/webp';
    photoInput.className = 'form-input';

    const photoHelp = document.createElement('small');
    photoHelp.className = 'muted-text';
    photoHelp.textContent = 'Optional. If selected, the image is uploaded and profile photo path is updated automatically.';

    photoGroup.append(photoLabel, photoCurrent, photoInput, photoHelp);
    form.appendChild(photoGroup);
}

function normalizeSkillItems(value) {
    return String(value || '')
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
}

function ensureSkillId(skill, index) {
    if (skill.id) return skill.id;
    return `sk-${Date.now()}-${index}`;
}

function syncSkillsHiddenField() {
    const hidden = document.getElementById('edit-skills-json');
    if (!hidden) return;
    hidden.value = JSON.stringify(currentPortfolioData.skills || []);
}

function addSkillCategory() {
    if (!Array.isArray(currentPortfolioData.skills)) {
        currentPortfolioData.skills = [];
    }

    currentPortfolioData.skills.push({
        id: `sk-${Date.now()}`,
        category: 'New Category',
        items: ['New Skill']
    });

    renderSkillsEditorRows();
}

function removeSkillCategory(index) {
    if (!Array.isArray(currentPortfolioData.skills)) return;
    if (currentPortfolioData.skills.length <= 1) {
        showAdminError('At least one skill category is required.');
        return;
    }

    currentPortfolioData.skills.splice(index, 1);
    renderSkillsEditorRows();
}

function renderSkillsEditor(form) {
    const tools = document.createElement('div');
    tools.className = 'admin-tools';

    const addCategoryButton = createAdminToolButton('Add Skill Category', addSkillCategory);
    const helper = document.createElement('p');
    helper.className = 'muted-text admin-status';
    helper.textContent = 'Use one category per row. Separate skills with commas.';

    tools.append(addCategoryButton, helper);
    form.appendChild(tools);

    const container = document.createElement('div');
    container.id = 'skillsEditorRows';
    container.className = 'skills-editor';
    form.appendChild(container);

    const hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.id = 'edit-skills-json';
    hidden.name = 'skills_json';
    form.appendChild(hidden);

    renderSkillsEditorRows();
}

function renderSkillsEditorRows() {
    const container = document.getElementById('skillsEditorRows');
    if (!container) return;

    if (!Array.isArray(currentPortfolioData.skills) || currentPortfolioData.skills.length === 0) {
        currentPortfolioData.skills = [{
            id: `sk-${Date.now()}`,
            category: 'New Category',
            items: ['New Skill']
        }];
    }

    container.replaceChildren();

    currentPortfolioData.skills.forEach((skillGroup, index) => {
        skillGroup.id = ensureSkillId(skillGroup, index);

        const row = document.createElement('div');
        row.className = 'skill-manager-row surface-2-bg';

        const categoryGroup = createInputGroup({
            id: `edit-skill-category-${index}`,
            labelText: 'Category',
            name: `skill_category_${index}`,
            value: skillGroup.category || ''
        });

        const itemsGroup = createInputGroup({
            id: `edit-skill-items-${index}`,
            labelText: 'Skills (comma-separated)',
            name: `skill_items_${index}`,
            value: Array.isArray(skillGroup.items) ? skillGroup.items.join(', ') : ''
        });

        const removeBtn = createAdminToolButton('Remove Category', () => {
            removeSkillCategory(index);
        });
        removeBtn.classList.add('danger-btn');

        categoryGroup.querySelector('input')?.addEventListener('input', event => {
            skillGroup.category = event.target.value.trim();
            syncSkillsHiddenField();
        });

        itemsGroup.querySelector('input')?.addEventListener('input', event => {
            skillGroup.items = normalizeSkillItems(event.target.value);
            syncSkillsHiddenField();
        });

        row.append(categoryGroup, itemsGroup, removeBtn);
        container.appendChild(row);
    });

    syncSkillsHiddenField();
}

function renderProjectManager(form) {
    const tools = document.createElement('div');
    tools.className = 'admin-tools';

    const importButton = createAdminToolButton('Refresh GitHub repository list', refreshRepositoryImport);
    const status = document.createElement('p');
    status.id = 'githubImportStatus';
    status.className = 'muted-text admin-status';

    tools.append(importButton, status);
    form.appendChild(tools);

    const manager = document.createElement('div');
    manager.className = 'projects-manager';
    manager.id = 'projectsManager';
    form.appendChild(manager);

    const hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.id = 'edit-projects-json';
    hidden.name = 'projects_json';
    hidden.value = JSON.stringify(currentPortfolioData.projects || []);
    form.appendChild(hidden);

    renderProjectsManagerList();
}

function renderProjectsManagerList() {
    const container = document.getElementById('projectsManager');
    if (!container) return;

    const projects = currentPortfolioData.projects || [];
    container.replaceChildren();

    projects.forEach((project, index) => {
        const row = document.createElement('div');
        row.className = 'project-manager-row surface-2-bg';
        row.draggable = true;
        row.dataset.projectId = project.id || project.repo || '';
        row.dataset.index = String(index);

        const dragHandle = document.createElement('button');
        dragHandle.type = 'button';
        dragHandle.className = 'drag-handle btn btn-secondary compact-btn';
        dragHandle.textContent = 'Drag';

        const info = document.createElement('div');
        info.className = 'project-row-info';

        const name = document.createElement('p');
        name.className = 'espresso-text font-bold';
        name.textContent = project.displayName || project.repo || `Project ${index + 1}`;

        const meta = document.createElement('p');
        meta.className = 'muted-text';
        meta.textContent = project.repoUrl || `https://github.com/${githubOwner}/${project.repo || ''}`;

        info.append(name, meta);

        const controls = document.createElement('div');
        controls.className = 'project-row-controls';

        const visibleToggle = document.createElement('label');
        visibleToggle.className = 'project-toggle';
        const visibleCheckbox = document.createElement('input');
        visibleCheckbox.type = 'checkbox';
        visibleCheckbox.checked = project.visible !== false;
        visibleCheckbox.addEventListener('change', () => {
            project.visible = visibleCheckbox.checked;
            syncProjectsJsonField();
        });
        const visibleText = document.createElement('span');
        visibleText.textContent = 'Show';
        visibleToggle.append(visibleCheckbox, visibleText);

        const featuredToggle = document.createElement('label');
        featuredToggle.className = 'project-toggle';
        const featuredCheckbox = document.createElement('input');
        featuredCheckbox.type = 'checkbox';
        featuredCheckbox.checked = Boolean(project.featured);
        featuredCheckbox.addEventListener('change', () => {
            project.featured = featuredCheckbox.checked;
            syncProjectsJsonField();
        });
        const featuredText = document.createElement('span');
        featuredText.textContent = 'Featured';
        featuredToggle.append(featuredCheckbox, featuredText);

        const editButton = createAdminToolButton('Edit tile', () => {
            openProjectTileEditor(project.id || project.repo || '');
        });

        controls.append(visibleToggle, featuredToggle, editButton);

        row.append(dragHandle, info, controls);
        attachProjectRowDragHandlers(row);
        container.appendChild(row);
    });

    syncProjectsJsonField();
}

function attachProjectRowDragHandlers(row) {
    row.addEventListener('dragstart', event => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', row.dataset.index || '0');
        row.classList.add('dragging');
    });

    row.addEventListener('dragend', () => {
        row.classList.remove('dragging');
    });

    row.addEventListener('dragover', event => {
        event.preventDefault();
        row.classList.add('drop-target');
    });

    row.addEventListener('dragleave', () => {
        row.classList.remove('drop-target');
    });

    row.addEventListener('drop', event => {
        event.preventDefault();
        row.classList.remove('drop-target');

        const fromIndex = Number(event.dataTransfer.getData('text/plain'));
        const toIndex = Number(row.dataset.index);

        if (Number.isNaN(fromIndex) || Number.isNaN(toIndex) || fromIndex === toIndex) {
            return;
        }

        const projects = currentPortfolioData.projects || [];
        const [moved] = projects.splice(fromIndex, 1);
        projects.splice(toIndex, 0, moved);

        renderProjectsManagerList();
    });
}

function syncProjectsJsonField() {
    const hidden = document.getElementById('edit-projects-json');
    if (!hidden) return;
    hidden.value = JSON.stringify(currentPortfolioData.projects || []);
}

function slugify(value) {
    return String(value)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function humanizeRepoName(repoName) {
    return repoName
        .replace(/[-_]+/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, character => character.toUpperCase());
}

function cleanMarkdownText(markdown) {
    return markdown
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
        .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
        .replace(/<[^>]+>/g, ' ')
        .replace(/[#>*_~|]/g, ' ')
        .replace(/\r/g, '\n')
        .split('\n')
        .map(line => line.trim())
        .filter(line => {
            if (!line) return false;
            if (/^(table of contents|installation|usage|license|features|requirements|setup|screenshots)$/i.test(line)) return false;
            if (/^-{3,}$/.test(line)) return false;
            return true;
        })
        .join('\n');
}

function draftDescriptionFromReadme(readme, fallbackDescription) {
    const cleanedText = cleanMarkdownText(readme || '');
    const paragraphs = cleanedText
        .split(/\n{2,}|\n/)
        .map(paragraph => paragraph.replace(/\s+/g, ' ').trim())
        .filter(paragraph => paragraph.length >= 50);

    const draft = paragraphs[0] || fallbackDescription || '';
    if (draft.length <= 360) return draft;

    const sentenceBoundary = draft.slice(0, 360).lastIndexOf('.');
    if (sentenceBoundary >= 120) {
        return draft.slice(0, sentenceBoundary + 1);
    }

    return `${draft.slice(0, 357).trim()}...`;
}

function buildProjectFromRepository(repo, readme, existingProject) {
    const topics = Array.isArray(repo.topics) ? repo.topics : [];
    const tags = [repo.language, ...topics].filter(Boolean);
    const uniqueTags = Array.from(new Set(tags));
    const readmeDescription = draftDescriptionFromReadme(readme, repo.description);

    return {
        id: existingProject?.id || `repo-${slugify(repo.name)}`,
        repo: repo.name,
        displayName: existingProject?.displayName || humanizeRepoName(repo.name),
        badge: existingProject?.badge || repo.language || 'Project',
        featured: existingProject?.featured ?? false,
        visible: existingProject?.visible ?? true,
        description: readmeDescription || existingProject?.description || 'GitHub repository imported for portfolio review.',
        tags: uniqueTags.length > 0 ? uniqueTags : existingProject?.tags || [],
        private: Boolean(repo.private),
        repoUrl: repo.html_url
    };
}

function findExistingProject(repo, existingProjects) {
    return existingProjects.find(project => {
        const sameUrl = project.repoUrl && project.repoUrl === repo.html_url;
        const sameOwnerRepo = project.repo === repo.name
            && (!project.repoUrl || project.repoUrl.includes(`/${repo.owner.login}/${repo.name}`));
        return sameUrl || sameOwnerRepo;
    });
}

async function refreshRepositoryImport() {
    if (typeof fetchRepositoriesWithReadmes !== 'function') {
        showAdminError('GitHub import helper is not loaded on this page.');
        return;
    }

    try {
        updateAdminStatus('Fetching repositories and READMEs...');

        const importedRepositories = await fetchRepositoriesWithReadmes();
        const existingProjects = currentPortfolioData.projects || [];
        const existingByRepoName = new Set(existingProjects.map(project => String(project.repo || '').toLowerCase()));

        let selectedCount = 0;
        const importedProjects = importedRepositories.map(({ repo, readme }) => {
            const existingProject = findExistingProject(repo, existingProjects);
            const nextProject = buildProjectFromRepository(repo, readme, existingProject);
            const isSelected = existingProject ? existingProject.visible !== false : !existingByRepoName.has(repo.name.toLowerCase());
            if (isSelected) selectedCount += 1;
            return {
                key: `${repo.owner.login}/${repo.name}`,
                selected: isSelected,
                source: repo,
                project: nextProject
            };
        });

        renderRepositoryPicker(importedProjects);
        updateAdminStatus(`Loaded ${importedProjects.length} repositories. ${selectedCount} selected.`);
    } catch (error) {
        console.error(error);
        updateAdminStatus(error.message || 'Import failed. Check browser console.', true);
        showAdminError(error.message || 'Failed to import GitHub repositories.');
    }
}

function renderRepositoryPicker(importedProjects) {
    let picker = document.getElementById('repoPicker');
    if (!picker) {
        picker = document.createElement('div');
        picker.id = 'repoPicker';
        picker.className = 'repo-picker';

        const form = document.getElementById('dynamicEditForm');
        const manager = document.getElementById('projectsManager');
        if (form && manager) {
            form.insertBefore(picker, manager);
        }
    }

    picker.replaceChildren();

    const heading = document.createElement('p');
    heading.className = 'espresso-text font-bold';
    heading.textContent = 'GitHub Repositories';
    picker.appendChild(heading);

    importedProjects.forEach(item => {
        const card = document.createElement('label');
        card.className = 'repo-option surface-2-bg';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = item.selected;

        const details = document.createElement('div');
        details.className = 'repo-option-details';

        const title = document.createElement('p');
        title.className = 'espresso-text font-bold';
        title.textContent = item.project.displayName;

        const meta = document.createElement('p');
        meta.className = 'muted-text';
        meta.textContent = `${item.key} ${item.source.private ? '· Private' : '· Public'}`;

        details.append(title, meta);
        card.append(checkbox, details);
        picker.appendChild(card);

        checkbox.addEventListener('change', () => {
            item.selected = checkbox.checked;
            applyRepositorySelection(importedProjects);
        });
    });

    applyRepositorySelection(importedProjects);
}

function applyRepositorySelection(importedProjects) {
    const existingProjects = currentPortfolioData.projects || [];
    const importedByRepo = new Map(importedProjects.map(item => [item.project.repo.toLowerCase(), item.project]));

    const keptExisting = existingProjects.filter(project => {
        const key = String(project.repo || '').toLowerCase();
        if (!importedByRepo.has(key)) return true;

        const imported = importedProjects.find(item => item.project.repo.toLowerCase() === key);
        return !imported?.selected;
    });

    const selectedImported = importedProjects
        .filter(item => item.selected)
        .map(item => item.project);

    currentPortfolioData.projects = [...selectedImported, ...keptExisting];
    renderProjectsManagerList();
    updateAdminStatus(`Selected ${selectedImported.length} repositories for portfolio display.`);
}

function resolveProjectById(projectId) {
    const projects = currentPortfolioData.projects || [];
    return resolveProjectFromList(projectId, projects);
}

function resolveProjectFromList(projectId, projects) {
    return projects.find(project => {
        const key = project.id || project.repo || '';
        return key === projectId;
    });
}

function openProjectTileEditor(projectId) {
    if (!projectId) return;

    if (!document.getElementById('editModal')) {
        injectSharedModal();
    }

    if (!currentPortfolioData) {
        fetchPortfolioData().then(data => {
            currentPortfolioData = data;
            openProjectTileEditor(projectId);
        }).catch(error => {
            console.error(error);
            showAdminError('Unable to load project data for editing.');
        });
        return;
    }

    const project = resolveProjectById(projectId);
    if (!project) return;

    activeEditSection = 'projectTile';

    const modal = document.getElementById('editModal');
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('dynamicEditForm');

    title.textContent = `Edit Tile: ${project.displayName}`;
    form.replaceChildren();
    form.dataset.projectTileId = projectId;

    form.appendChild(createInputGroup({
        id: 'edit-project-displayName',
        labelText: 'Display Name',
        name: 'project_displayName',
        value: project.displayName || ''
    }));

    form.appendChild(createInputGroup({
        id: 'edit-project-badge',
        labelText: 'Badge',
        name: 'project_badge',
        value: project.badge || ''
    }));

    form.appendChild(createInputGroup({
        id: 'edit-project-description',
        labelText: 'Description',
        name: 'project_description',
        multiline: true,
        value: project.description || ''
    }));

    form.appendChild(createInputGroup({
        id: 'edit-project-tags',
        labelText: 'Tags (comma-separated)',
        name: 'project_tags',
        value: Array.isArray(project.tags) ? project.tags.join(', ') : ''
    }));

    form.appendChild(createInputGroup({
        id: 'edit-project-repoUrl',
        labelText: 'Repository URL',
        name: 'project_repoUrl',
        value: project.repoUrl || ''
    }));

    const visibilityGroup = document.createElement('div');
    visibilityGroup.className = 'form-group';

    const visibleLabel = document.createElement('label');
    visibleLabel.className = 'project-toggle';
    const visibleCheck = document.createElement('input');
    visibleCheck.type = 'checkbox';
    visibleCheck.name = 'project_visible';
    visibleCheck.checked = project.visible !== false;
    const visibleText = document.createElement('span');
    visibleText.textContent = 'Visible on projects page';
    visibleLabel.append(visibleCheck, visibleText);

    const featuredLabel = document.createElement('label');
    featuredLabel.className = 'project-toggle';
    const featuredCheck = document.createElement('input');
    featuredCheck.type = 'checkbox';
    featuredCheck.name = 'project_featured';
    featuredCheck.checked = Boolean(project.featured);
    const featuredText = document.createElement('span');
    featuredText.textContent = 'Featured';
    featuredLabel.append(featuredCheck, featuredText);

    visibilityGroup.append(visibleLabel, featuredLabel);
    form.appendChild(visibilityGroup);

    modal.style.display = 'flex';
}

function closeEditModal() {
    const modal = document.getElementById('editModal');
    if (modal) modal.style.display = 'none';
}

async function saveProfilePhotoIfSelected(updatedPortfolioData) {
    const input = getFormElement('profile_photo_file');
    const file = input?.files?.[0];
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    bytes.forEach(byte => {
        binary += String.fromCharCode(byte);
    });

    const base64Content = btoa(binary);
    const extension = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(extension) ? extension : 'jpg';
    const assetPath = `assets/profile.${safeExt}`;

    await commitFileToGitHub(
        assetPath,
        base64Content,
        'Admin: Update profile photo',
        { isBase64: true }
    );

    updatedPortfolioData.profile.photo = assetPath;
}

function collectEditedData() {
    const sectionConfig = editableSections[activeEditSection];
    const form = document.getElementById('dynamicEditForm');
    const updatedPortfolioData = cloneData(currentPortfolioData);

    if (activeEditSection === 'projectTile') {
        const tileId = form.dataset.projectTileId;
        const project = resolveProjectFromList(tileId, updatedPortfolioData.projects || []);
        if (!project) throw new Error('Project to edit was not found.');

        project.displayName = form.elements.project_displayName.value.trim();
        project.badge = form.elements.project_badge.value.trim();
        project.description = form.elements.project_description.value.trim();
        project.tags = form.elements.project_tags.value
            .split(',')
            .map(tag => tag.trim())
            .filter(Boolean);
        project.repoUrl = form.elements.project_repoUrl.value.trim();
        project.visible = form.elements.project_visible.checked;
        project.featured = form.elements.project_featured.checked;

        return updatedPortfolioData;
    }

    if (!sectionConfig) {
        throw new Error('Unknown editable section.');
    }

    if (sectionConfig.type === 'fields') {
        updatedPortfolioData[activeEditSection] = {
            ...updatedPortfolioData[activeEditSection]
        };

        sectionConfig.fields.forEach(fieldConfig => {
            updatedPortfolioData[activeEditSection][fieldConfig.key] =
                form.elements[fieldConfig.key].value.trim();
        });
    } else if (sectionConfig.type === 'profile') {
        updatedPortfolioData.profile = {
            ...updatedPortfolioData.profile,
            name: form.elements.profile_name.value.trim(),
            title: form.elements.profile_title.value.trim(),
            tagline: form.elements.profile_tagline.value.trim(),
            summary: form.elements.profile_summary.value.trim(),
            location: form.elements.profile_location.value.trim(),
            email: form.elements.profile_email.value.trim(),
            github: form.elements.profile_github.value.trim(),
            linkedin: form.elements.profile_linkedin.value.trim()
        };
    } else if (sectionConfig.type === 'skills') {
        updatedPortfolioData.skills = cloneData(currentPortfolioData.skills || []);
    } else if (sectionConfig.type === 'projects') {
        updatedPortfolioData.projects = cloneData(currentPortfolioData.projects || []);
    } else {
        updatedPortfolioData[activeEditSection] = JSON.parse(form.elements.json.value);
    }

    return updatedPortfolioData;
}

/**
 * Commits the modified portfolio.json back to GitHub.
 */
async function commitChanges() {
    if (!activeEditSection) return;

    if (typeof commitFileToGitHub !== 'function') {
        showAdminError('GitHub save helper is not loaded on this page.');
        return;
    }

    let updatedPortfolioData;
    try {
        updatedPortfolioData = collectEditedData();
    } catch (error) {
        console.error(error);
        showAdminError('The edited data is invalid. Fix the issue and try again.');
        return;
    }

    try {
        if (activeEditSection === 'profile') {
            await saveProfilePhotoIfSelected(updatedPortfolioData);
        }

        await commitFileToGitHub(
            'data/portfolio.json',
            updatedPortfolioData,
            `Admin: Update ${activeEditSection}`
        );

        currentPortfolioData = updatedPortfolioData;
        showAdminError('Changes saved. Refreshing...');
        window.location.reload();
    } catch (error) {
        console.error(error);
        showAdminError(error.message || 'Failed to save changes. Check the browser console.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkExistingSession();

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleAdminLogin);
    }

    observeProjectGalleryForAdminEditing();
});
