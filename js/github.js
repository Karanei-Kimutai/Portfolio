// js/github.js

const githubOwner = 'Karanei-Kimutai';
const githubRepo = 'Portfolio';

function getGitHubToken() {
    const token = sessionStorage.getItem('githubPat');
    if (!token) throw new Error('Not authenticated');
    return token;
}

function getGitHubHeaders(token, accept = 'application/vnd.github+json') {
    return {
        'Authorization': `Bearer ${token}`,
        'Accept': accept
    };
}

/**
 * Fetches the current SHA of a file, required by GitHub API for updates.
 */
async function getFileSha(path, token) {
    const url = `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${path}`;
    const response = await fetch(url, {
        headers: getGitHubHeaders(token)
    });
    if (response.ok) {
        const data = await response.json();
        return data.sha;
    }
    return null;
}

/**
 * Commits a file directly to the GitHub repository.
 */
async function commitFileToGitHub(path, content, commitMessage, isBase64 = false) {
    const token = getGitHubToken();
    
    const fileSha = await getFileSha(path, token);
    
    // Encode JSON to Base64 if it's not already a Base64 image string
    const encodedContent = isBase64 ? content : btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2))));

    const payload = {
        message: commitMessage,
        content: encodedContent,
        branch: 'main'
    };
    if (fileSha) payload.sha = fileSha;

    const response = await fetch(`https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${path}`, {
        method: 'PUT',
        headers: {
            ...getGitHubHeaders(token),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`Commit failed: ${response.status}`);
    return await response.json();
}

/**
 * Lists repositories accessible to the current authenticated user.
 */
async function fetchAuthenticatedRepositories() {
    const token = getGitHubToken();
    const url = 'https://api.github.com/user/repos?visibility=all&affiliation=owner,collaborator,organization_member&sort=pushed&per_page=100';
    const response = await fetch(url, {
        headers: getGitHubHeaders(token)
    });

    if (!response.ok) {
        throw new Error(`Repository fetch failed: ${response.status}`);
    }

    return await response.json();
}

/**
 * Fetches the README content from a specific repository.
 */
async function fetchProjectReadme(repoName, owner = githubOwner) {
    const token = getGitHubToken();
    const url = `https://api.github.com/repos/${owner}/${repoName}/readme`;
    const response = await fetch(url, {
        headers: getGitHubHeaders(token, 'application/vnd.github.raw+json')
    });

    return response.ok ? await response.text() : '';
}

/**
 * Fetches repositories and their README text for drafting portfolio projects.
 */
async function fetchRepositoriesWithReadmes() {
    const repositories = await fetchAuthenticatedRepositories();
    const importableRepositories = repositories.filter(repo => {
        return !(repo.owner?.login === githubOwner && repo.name === githubRepo);
    });

    return await Promise.all(importableRepositories.map(async repo => ({
        repo,
        readme: await fetchProjectReadme(repo.name, repo.owner.login)
    })));
}
