// js/admin.js

let currentPortfolioData = null;
let activeEditSection = null;

const editableSections = {
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
        type: 'json'
    },
    projects: {
        title: 'Edit Projects',
        type: 'json'
    }
};

/**
 * Handles the login form submission.
 *
 * @param {Event} event - The form submit event.
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

function bindEditButtons() {
    document.querySelectorAll('.edit-btn[data-edit-section]').forEach(button => {
        if (button.dataset.bound === 'true') return;

        button.dataset.bound = 'true';
        button.addEventListener('click', () => {
            openEditModal(button.dataset.editSection);
        });
    });
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
        alert('Unable to load portfolio data for editing.');
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
            const group = document.createElement('div');
            group.className = 'form-group';

            const label = document.createElement('label');
            label.className = 'brown-text';
            label.htmlFor = `edit-${fieldConfig.key}`;
            label.textContent = fieldConfig.label;

            const input = document.createElement(fieldConfig.multiline ? 'textarea' : 'input');
            input.id = `edit-${fieldConfig.key}`;
            input.name = fieldConfig.key;
            input.className = 'form-input';
            input.required = true;
            input.value = currentPortfolioData[sectionName]?.[fieldConfig.key] || '';

            group.append(label, input);
            form.appendChild(group);
        });
    } else {
        if (sectionName === 'projects') {
            const tools = document.createElement('div');
            tools.className = 'admin-tools';

            const importButton = createAdminToolButton('Import GitHub repos', importProjectsFromGitHub);
            const status = document.createElement('p');
            status.id = 'githubImportStatus';
            status.className = 'muted-text admin-status';

            tools.append(importButton, status);
            form.appendChild(tools);
        }

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

function closeEditModal() {
    const modal = document.getElementById('editModal');
    if (modal) modal.style.display = 'none';
}

function collectEditedData() {
    const sectionConfig = editableSections[activeEditSection];
    const form = document.getElementById('dynamicEditForm');
    const updatedPortfolioData = JSON.parse(JSON.stringify(currentPortfolioData));

    if (sectionConfig.type === 'fields') {
        updatedPortfolioData[activeEditSection] = {
            ...updatedPortfolioData[activeEditSection]
        };

        sectionConfig.fields.forEach(fieldConfig => {
            updatedPortfolioData[activeEditSection][fieldConfig.key] =
                form.elements[fieldConfig.key].value.trim();
        });
    } else {
        updatedPortfolioData[activeEditSection] = JSON.parse(form.elements.json.value);
    }

    return updatedPortfolioData;
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
    const tags = [
        repo.language,
        ...topics
    ].filter(Boolean);
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

async function importProjectsFromGitHub() {
    const status = document.getElementById('githubImportStatus');
    const jsonTextarea = document.getElementById('edit-json');

    if (typeof fetchRepositoriesWithReadmes !== 'function') {
        alert('GitHub import helper is not loaded on this page.');
        return;
    }

    try {
        if (status) status.textContent = 'Fetching repositories and READMEs...';

        const existingProjects = JSON.parse(jsonTextarea.value);
        const importedRepositories = await fetchRepositoriesWithReadmes();
        const importedProjects = importedRepositories.map(({ repo, readme }) => {
            return buildProjectFromRepository(
                repo,
                readme,
                findExistingProject(repo, existingProjects)
            );
        });
        const importedUrls = new Set(importedProjects.map(project => project.repoUrl).filter(Boolean));
        const importedRepoNames = new Set(importedProjects.map(project => project.repo.toLowerCase()));
        const localOnlyProjects = existingProjects.filter(project => {
            if (project.repoUrl && importedUrls.has(project.repoUrl)) return false;
            return !importedRepoNames.has(String(project.repo).toLowerCase());
        });
        const nextProjects = [...importedProjects, ...localOnlyProjects];

        jsonTextarea.value = JSON.stringify(nextProjects, null, 2);
        if (status) {
            status.textContent = `Imported ${importedProjects.length} repositories. Review the JSON, then save.`;
        }
    } catch (error) {
        console.error(error);
        if (status) status.textContent = 'Import failed. Check the browser console.';
        alert('Failed to import GitHub repositories.');
    }
}

/**
 * Commits the modified portfolio.json back to GitHub.
 */
async function commitChanges() {
    if (!activeEditSection) return;

    if (typeof commitFileToGitHub !== 'function') {
        alert('GitHub save helper is not loaded on this page.');
        return;
    }

    let updatedPortfolioData;
    try {
        updatedPortfolioData = collectEditedData();
    } catch (error) {
        console.error(error);
        alert('The edited JSON is invalid. Fix the syntax and try again.');
        return;
    }

    try {
        await commitFileToGitHub(
            'data/portfolio.json',
            updatedPortfolioData,
            `Admin: Update ${activeEditSection}`
        );
        alert('Changes saved. Refreshing...');
        window.location.reload();
    } catch (error) {
        console.error(error);
        alert('Failed to save changes. Check the browser console.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkExistingSession();

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleAdminLogin);
    }
});
