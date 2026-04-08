/**
 * Customer Portal Routes
 */

import { Router, Request, Response } from 'express';
import { customerPortalService } from '../services/customer-portal.service';

const router = Router();

// ==================== Portal Users ====================

// Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const user = await customerPortalService.registerUser(organizationId, req.body);
    res.status(201).json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { email, password } = req.body;
    const result = await customerPortalService.login(organizationId, email, password);
    res.json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

// Validate token
router.get('/validate', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const user = await customerPortalService.validateToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    res.json(user);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

// Logout
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      await customerPortalService.logout(token);
    }
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update profile
router.put('/profile', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-portal-user-id'] as string;
    const user = await customerPortalService.updateProfile(userId, req.body);
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Portal Tickets ====================

// Get user's tickets
router.get('/tickets', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-portal-user-id'] as string;
    const tickets = await customerPortalService.getUserTickets(userId);
    res.json(tickets);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create ticket
router.post('/tickets', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-portal-user-id'] as string;
    const { subject, description, type } = req.body;
    const ticket = await customerPortalService.createTicket(userId, subject, description, type);
    res.status(201).json(ticket);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add comment to ticket
router.post('/tickets/:id/comments', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-portal-user-id'] as string;
    const { content } = req.body;
    const comment = await customerPortalService.addTicketComment(userId, req.params.id, content);
    res.status(201).json(comment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Knowledge Base ====================

// Get public articles
router.get('/knowledge/articles', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { categoryId, search } = req.query;
    const articles = await customerPortalService.getPublicArticles(
      organizationId,
      categoryId as string,
      search as string
    );
    res.json(articles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get article by slug
router.get('/knowledge/articles/:slug', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const article = await customerPortalService.getArticleBySlug(organizationId, req.params.slug);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.json(article);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get categories
router.get('/knowledge/categories', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const categories = await customerPortalService.getCategories(organizationId);
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Search knowledge base
router.get('/knowledge/search', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { q, limit } = req.query;
    const results = await customerPortalService.searchKnowledgeBase(
      organizationId,
      q as string,
      limit ? parseInt(limit as string) : undefined
    );
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get popular articles
router.get('/knowledge/popular', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { limit } = req.query;
    const articles = await customerPortalService.getPopularArticles(
      organizationId,
      limit ? parseInt(limit as string) : undefined
    );
    res.json(articles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Submit feedback
router.post('/knowledge/articles/:id/feedback', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-portal-user-id'] as string;
    const { isHelpful, comment } = req.body;
    const feedback = await customerPortalService.submitFeedback(
      req.params.id,
      userId || null,
      isHelpful,
      comment
    );
    res.status(201).json(feedback);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Admin Routes (Knowledge Management) ====================

// Create category (admin)
router.post('/admin/categories', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { name, slug, description, parentId, icon } = req.body;
    const category = await customerPortalService.createCategory(
      organizationId,
      name,
      slug,
      description,
      parentId,
      icon
    );
    res.status(201).json(category);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create article (admin)
router.post('/admin/articles', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const authorId = req.headers['x-user-id'] as string;
    const article = await customerPortalService.createArticle(organizationId, authorId, req.body);
    res.status(201).json(article);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update article (admin)
router.put('/admin/articles/:id', async (req: Request, res: Response) => {
  try {
    const article = await customerPortalService.updateArticle(req.params.id, req.body);
    res.json(article);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete article (admin)
router.delete('/admin/articles/:id', async (req: Request, res: Response) => {
  try {
    await customerPortalService.deleteArticle(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
