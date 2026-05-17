/**
 * Simple GitHub Client - Just fetch repos
 * No complex PR fetching or enrichment
 */

const axios = require('axios');

class GitHubClient {
  /**
   * Fetch user's repositories (simple)
   */
  async getRepos(token) {
    try {
      const response = await axios.get('https://api.github.com/user/repos', {
        headers: { 
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json'
        },
        params: {
          sort: 'updated',
          per_page: 20,
          affiliation: 'owner,collaborator'
        }
      });
      
      return response.data.map(repo => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        owner: repo.owner?.login || '',
        language: repo.language || 'Unknown',
        stars: repo.stargazers_count,
        private: repo.private,
        url: repo.html_url,
        html_url: repo.html_url,
        description: repo.description || '',
        default_branch: repo.default_branch || 'main',
        updatedAt: repo.updated_at,
        updated_at: repo.updated_at
      }));
    } catch (error) {
      console.error('GitHub API error:', error.message);
      return [];
    }
  }
  
  /**
   * Validate GitHub token
   */
  async validateToken(token) {
    try {
      const response = await axios.get('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return {
        valid: true,
        user: {
          login: response.data.login,
          name: response.data.name,
          avatar: response.data.avatar_url
        }
      };
    } catch (error) {
      return { valid: false, user: null };
    }
  }

  /**
   * Get repository contributors
   */
  async getRepoContributors(owner, repo, token) {
    try {
      const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contributors`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json'
        },
        params: {
          per_page: 100
        }
      });
      return response.data.map(contributor => ({
        username: contributor.login,
        avatar: contributor.avatar_url,
        contributions: contributor.contributions,
        url: contributor.html_url,
        type: contributor.type
      }));
    } catch (error) {
      console.error('Error fetching contributors:', error.message);
      return [];
    }
  }

  /**
   * Get repository pull requests
   */
  async getRepoPullRequests(owner, repo, token, state = 'open') {
    try {
      const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json'
        },
        params: {
          state, // 'open', 'closed', 'all'
          per_page: 100,
          sort: 'updated',
          direction: 'desc'
        }
      });
      return response.data.map(pr => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        author: pr.user.login,
        authorAvatar: pr.user.avatar_url,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        url: pr.html_url,
        baseBranch: pr.base.ref,
        headBranch: pr.head.ref,
        draft: pr.draft,
        mergeable: pr.mergeable,
        additions: pr.additions,
        deletions: pr.deletions,
        changedFiles: pr.changed_files
      }));
    } catch (error) {
      console.error('Error fetching PRs:', error.message);
      return [];
    }
  }

  /**
   * Get files changed in a pull request
   */
  async getPRFiles(owner, repo, pullNumber, token) {
    try {
      const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/files`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json'
        },
        params: {
          per_page: 100
        }
      });
      return response.data.map(file => ({
        filename: file.filename,
        status: file.status, // 'added', 'modified', 'removed', 'renamed'
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        patch: file.patch
      }));
    } catch (error) {
      console.error('Error fetching PR files:', error.message);
      return [];
    }
  }

  /**
   * Get repository details
   */
  async getRepository(owner, repo, token) {
    try {
      const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });
      return {
        id: response.data.id,
        name: response.data.name,
        fullName: response.data.full_name,
        owner: response.data.owner.login,
        description: response.data.description,
        language: response.data.language,
        stars: response.data.stargazers_count,
        forks: response.data.forks_count,
        openIssues: response.data.open_issues_count,
        defaultBranch: response.data.default_branch,
        private: response.data.private,
        url: response.data.html_url,
        createdAt: response.data.created_at,
        updatedAt: response.data.updated_at
      };
    } catch (error) {
      console.error('Error fetching repository:', error.message);
      return null;
    }
  }
}

module.exports = new GitHubClient();

// Made with Bob - Enhanced with real GitHub data integration
