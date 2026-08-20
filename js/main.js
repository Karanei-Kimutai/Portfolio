// js/main.js

function clearElement(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

function createElement(tagName, options = {}) {
    const element = document.createElement(tagName);

    if (options.className) element.className = options.className;
    if (options.textContent !== undefined) element.textContent = options.textContent;
    if (options.href) element.href = options.href;
    if (options.target) element.target = options.target;
    if (options.rel) element.rel = options.rel;

    return element;
}

/**
 * Updates the DOM elements in the hero section using the provided profile data.
 *
 * @param {Object} profileData - The profile object containing name, title, etc.
 */
function renderProfileSection(profileData) {
    const heroNameElement = document.getElementById('heroName');
    const heroTitleElement = document.getElementById('heroTitle');
    const heroTaglineElement = document.getElementById('heroTagline');
    const heroSummaryElement = document.getElementById('heroSummary');
    const githubLinkElement = document.getElementById('githubLink');
    const linkedinLinkElement = document.getElementById('linkedinLink');
    const profilePhotoElement = document.getElementById('profilePhoto');

    if (heroNameElement) heroNameElement.textContent = profileData.name;
    if (heroTitleElement) heroTitleElement.textContent = profileData.title;
    if (heroTaglineElement) heroTaglineElement.textContent = profileData.tagline;
    if (heroSummaryElement) heroSummaryElement.textContent = profileData.summary;
    if (profilePhotoElement && profileData.photo) {
        profilePhotoElement.src = profileData.photo;
        profilePhotoElement.alt = `${profileData.name} profile photo`;
    }

    if (githubLinkElement && profileData.github) {
        githubLinkElement.href = profileData.github;
        githubLinkElement.rel = 'noopener noreferrer';
    }
    if (linkedinLinkElement && profileData.linkedin) {
        linkedinLinkElement.href = profileData.linkedin;
        linkedinLinkElement.rel = 'noopener noreferrer';
    }
}

/**
 * Generates and injects project tiles into the gallery container.
 *
 * @param {Array} projectsArray - The array of project objects from portfolio.json.
 */
function renderProjectsGallery(projectsArray) {
    const galleryContainer = document.getElementById('projectsGallery');
    if (!galleryContainer) return;

    clearElement(galleryContainer);

    const visibleProjects = projectsArray.filter(project => project.visible === true);

    visibleProjects.forEach(project => {
        const article = createElement('article', { className: 'project-tile surface-2-bg' });
        const header = createElement('header', { className: 'tile-header' });
        const title = createElement('h3', {
            className: 'espresso-text',
            textContent: project.displayName
        });
        const badge = createElement('span', {
            className: 'badge amber-bg amber-border',
            textContent: project.badge
        });
        const description = createElement('p', {
            className: 'brown-text',
            textContent: project.description
        });
        const tagsContainer = createElement('div', { className: 'tags-container' });
        const footer = createElement('footer', { className: 'tile-footer border-top' });

        header.append(title, badge);

        project.tags.forEach(tag => {
            tagsContainer.appendChild(createElement('span', {
                className: 'tech-tag',
                textContent: tag
            }));
        });

        if (project.private) {
            footer.appendChild(createElement('span', {
                className: 'muted-text',
                textContent: 'Private repository'
            }));
        } else {
            const githubUrl = project.repoUrl || `https://github.com/Karanei-Kimutai/${project.repo}`;
            footer.appendChild(createElement('a', {
                className: 'amber-text font-bold',
                href: githubUrl,
                target: '_blank',
                rel: 'noopener noreferrer',
                textContent: 'View on GitHub'
            }));
        }

        article.append(header, description, tagsContainer, footer);
        galleryContainer.appendChild(article);
    });
}

/**
 * Renders the education and skills sections on the About page.
 */
function renderAboutSection(educationData, skillsData) {
    const educationContainer = document.getElementById('educationTimeline');
    const skillsContainer = document.getElementById('skillsGrid');

    if (educationContainer && Array.isArray(educationData)) {
        clearElement(educationContainer);

        educationData.forEach(edu => {
            const item = createElement('div', { className: 'edu-item' });
            const degree = createElement('h3', {
                className: 'espresso-text edu-degree',
                textContent: edu.degree
            });
            const institution = createElement('p', {
                className: 'amber-text font-bold',
                textContent: `${edu.institution} | ${edu.period}`
            });
            const location = createElement('p', {
                className: 'muted-text edu-meta',
                textContent: `${edu.location}${edu.note ? ` · ${edu.note}` : ''}`
            });
            const details = createElement('p', {
                className: 'brown-text edu-details',
                textContent: edu.details
            });

            item.append(degree, institution, location, details);
            educationContainer.appendChild(item);
        });
    }

    if (skillsContainer && Array.isArray(skillsData)) {
        clearElement(skillsContainer);

        skillsData.forEach(skillGroup => {
            const category = createElement('div', { className: 'skill-category surface-2-bg' });
            const title = createElement('h4', {
                className: 'espresso-text',
                textContent: skillGroup.category
            });
            const tagsContainer = createElement('div', { className: 'tags-container' });

            skillGroup.items.forEach(item => {
                tagsContainer.appendChild(createElement('span', {
                    className: 'tech-tag',
                    textContent: item
                }));
            });

            category.append(title, tagsContainer);
            skillsContainer.appendChild(category);
        });
    }
}

function renderContactSection(contactData) {
    const introElement = document.getElementById('contactIntro');
    const availabilityElement = document.getElementById('contactAvailability');

    if (introElement) introElement.textContent = contactData.intro;
    if (availabilityElement) availabilityElement.textContent = contactData.availability;
}

/**
 * Initializes the IntersectionObserver to track same-page scroll progress.
 */
function setupSidebarNavigationObserver() {
    const pageSections = document.querySelectorAll('.page-section');
    const navLinks = Array.from(document.querySelectorAll('#sidebarNav .nav-link'))
        .filter(link => link.getAttribute('href')?.startsWith('#'));

    if (pageSections.length === 0 || navLinks.length === 0) {
        return;
    }

    const observerOptions = {
        root: null,
        rootMargin: '-20% 0px -60% 0px',
        threshold: 0
    };

    const sectionObserverCallback = (entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const currentSectionId = entry.target.getAttribute('id');

                navLinks.forEach(link => {
                    link.classList.remove('active', 'amber-text', 'font-bold');

                    if (link.getAttribute('href') === `#${currentSectionId}`) {
                        link.classList.add('active', 'amber-text', 'font-bold');
                    }
                });
            }
        });
    };

    const sectionObserver = new IntersectionObserver(sectionObserverCallback, observerOptions);

    pageSections.forEach(section => {
        sectionObserver.observe(section);
    });
}

/**
 * Initializes the application by fetching data and triggering rendering functions.
 */
async function initializePortfolioApp() {
    const portfolioDataObj = await fetchPortfolioData();

    if (portfolioDataObj) {
        if (portfolioDataObj.profile) {
            renderProfileSection(portfolioDataObj.profile);
        }

        if (portfolioDataObj.projects) {
            renderProjectsGallery(portfolioDataObj.projects);
        }

        if (portfolioDataObj.education || portfolioDataObj.skills) {
            renderAboutSection(portfolioDataObj.education, portfolioDataObj.skills);
        }

        if (portfolioDataObj.contact) {
            renderContactSection(portfolioDataObj.contact);
        }
    } else {
        console.warn('Portfolio data failed to load.');
    }

    setupSidebarNavigationObserver();
}

document.addEventListener('DOMContentLoaded', initializePortfolioApp);
