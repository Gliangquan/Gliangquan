import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const USER = 'Gliangquan';
const README_PATH = new URL('../README.md', import.meta.url);
const DATA_PATH = new URL('../data/profile.json', import.meta.url);

async function githubJson(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': `${USER}-profile`,
      'Accept': 'application/vnd.github+json'
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

function topReposMarkdown(repos) {
  if (!repos.length) return '- More public repositories coming soon.';
  return repos
    .map((repo, index) => `${index + 1}. [${repo.full_name}](${repo.html_url}) — ${repo.description || 'No description yet.'} (⭐ ${repo.stargazers_count})`)
    .join('\n');
}

async function main() {
  const [user, repos] = await Promise.all([
    githubJson(`https://api.github.com/users/${USER}`),
    githubJson(`https://api.github.com/users/${USER}/repos?per_page=100&sort=updated`)
  ]);

  const publicRepos = repos.filter((repo) => !repo.private && !repo.fork);
  const topRepos = [...publicRepos]
    .sort((a, b) => b.stargazers_count - a.stargazers_count || new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 6);

  const updatedAt = new Date().toISOString();
  const snapshot = [
    `- Updated: ${updatedAt}`,
    `- Public repositories: ${publicRepos.length}`,
    `- Followers: ${user.followers}`,
    `- Following: ${user.following}`,
    `- Daily automation: [github-daily-radar](https://github.com/Gliangquan/github-daily-radar)`
  ].join('\n');

  const projects = topReposMarkdown(topRepos);

  mkdirSync(new URL('../data/', import.meta.url), { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify({ updatedAt, user, publicRepos: publicRepos.map(({ name, full_name, html_url, stargazers_count, description, updated_at }) => ({ name, full_name, html_url, stargazers_count, description, updated_at })) }, null, 2) + '\n');

  let readme = readFileSync(README_PATH, 'utf8');
  readme = readme.replace(/<!-- SNAPSHOT:START -->[\s\S]*<!-- SNAPSHOT:END -->/, `<!-- SNAPSHOT:START -->\n${snapshot}\n<!-- SNAPSHOT:END -->`);
  readme = readme.replace(/<!-- PROJECTS:START -->[\s\S]*<!-- PROJECTS:END -->/, `<!-- PROJECTS:START -->\n${projects}\n<!-- PROJECTS:END -->`);
  writeFileSync(README_PATH, readme);

  console.log(`Updated profile with ${publicRepos.length} public repositories.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
