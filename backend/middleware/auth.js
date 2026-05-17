/**
 * Simple Authentication Middleware
 */

const githubClient = require('../services/integrations/githubClient');

/**
 * Validate GitHub token (required)
 */
async function validateGitHubToken(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please connect your GitHub account'
    });
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  try {
    const validation = await githubClient.validateToken(token);
    
    if (!validation.valid) {
      return res.status(401).json({ 
        error: 'Invalid GitHub token',
        message: 'Please reconnect your GitHub account'
      });
    }
    
    // Attach to request
    req.githubToken = token;
    req.githubUser = validation.user;
    next();
  } catch (error) {
    console.error('Token validation error:', error);
    return res.status(401).json({ 
      error: 'Token validation failed',
      message: 'Please reconnect your GitHub account'
    });
  }
}

/**
 * Optional authentication (doesn't fail if no token)
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    req.githubToken = null;
    req.githubUser = null;
    return next();
  }
  
  return validateGitHubToken(req, res, next);
}

module.exports = { validateGitHubToken, optionalAuth };

// Made with Bob
