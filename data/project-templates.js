// data/project-templates.js

/**
 * Project Templates for Web Development
 * 
 * These templates define common web development project types
 * with predefined requirements, tasks, and agent assignments.
 */

module.exports = [
  {
    name: "E-commerce Website",
    description: "A full-featured online store with product catalog, shopping cart, and payment processing",
    type: "e-commerce",
    requirements: `
- Responsive design that works on mobile, tablet, and desktop
- Product catalog with categories, filters, and search
- Product detail pages with images, descriptions, and reviews
- Shopping cart and checkout process
- Secure payment processing integration
- User account management
- Order history and tracking
- Admin dashboard for inventory and order management
    `,
    estimatedDuration: 21, // days
    suggestedAgents: ["Project Manager", "Architect", "Frontend", "Backend", "Content", "Testing"],
    defaultTasks: [
      {
        title: "Project Planning and Architecture",
        description: "Define project scope, architecture, and technology stack",
        assignedRoleTo: "Architect",
        priority: "high",
        dependencies: []
      },
      {
        title: "Database Schema Design",
        description: "Design database schema for products, users, orders, and inventory",
        assignedRoleTo: "Backend",
        priority: "high",
        dependencies: ["Project Planning and Architecture"]
      },
      {
        title: "UI/UX Design",
        description: "Create wireframes and visual design for all pages",
        assignedRoleTo: "Frontend",
        priority: "high",
        dependencies: ["Project Planning and Architecture"]
      },
      {
        title: "Frontend Development - Product Listing",
        description: "Implement product catalog with filtering and search functionality",
        assignedRoleTo: "Frontend",
        priority: "medium",
        dependencies: ["UI/UX Design"]
      },
      {
        title: "Frontend Development - Product Detail",
        description: "Implement product detail pages with images, descriptions, and reviews",
        assignedRoleTo: "Frontend",
        priority: "medium",
        dependencies: ["UI/UX Design"]
      },
      {
        title: "Frontend Development - Shopping Cart",
        description: "Implement shopping cart functionality with ability to update quantities",
        assignedRoleTo: "Frontend",
        priority: "medium",
        dependencies: ["UI/UX Design"]
      },
      {
        title: "Frontend Development - Checkout",
        description: "Implement checkout process with shipping, billing, and payment",
        assignedRoleTo: "Frontend",
        priority: "medium",
        dependencies: ["Frontend Development - Shopping Cart"]
      },
      {
        title: "Backend Development - API",
        description: "Create RESTful API endpoints for products, users, and orders",
        assignedRoleTo: "Backend",
        priority: "high",
        dependencies: ["Database Schema Design"]
      },
      {
        title: "Backend Development - Authentication",
        description: "Implement user authentication and account management",
        assignedRoleTo: "Backend",
        priority: "high",
        dependencies: ["Database Schema Design"]
      },
      {
        title: "Backend Development - Payment Integration",
        description: "Integrate payment gateway for secure transactions",
        assignedRoleTo: "Backend",
        priority: "medium",
        dependencies: ["Backend Development - API"]
      },
      {
        title: "Content Creation - Product Descriptions",
        description: "Write engaging product descriptions and metadata for SEO",
        assignedRoleTo: "Content",
        priority: "medium",
        dependencies: []
      },
      {
        title: "Testing - Frontend",
        description: "Unit and integration testing for frontend components",
        assignedRoleTo: "Testing",
        priority: "medium",
        dependencies: ["Frontend Development - Checkout"]
      },
      {
        title: "Testing - Backend",
        description: "Unit and integration testing for backend components",
        assignedRoleTo: "Testing",
        priority: "medium",
        dependencies: ["Backend Development - Payment Integration"]
      },
      {
        title: "End-to-End Testing",
        description: "Complete end-to-end testing of the entire application",
        assignedRoleTo: "Testing",
        priority: "high",
        dependencies: ["Testing - Frontend", "Testing - Backend"]
      }
    ]
  },
  {
    name: "Corporate Website",
    description: "Professional business website with company information, services, and contact details",
    type: "corporate",
    requirements: `
- Clean, professional design
- Company overview and history
- Services/products information
- Team member profiles
- Contact form and information
- News/blog section
- Responsive design for all devices
- SEO optimization
- Integration with social media
    `,
    estimatedDuration: 14, // days
    suggestedAgents: ["Project Manager", "Frontend", "Backend", "Content"],
    defaultTasks: [
      {
        title: "Project Planning",
        description: "Define project goals, sitemap, and content requirements",
        assignedRoleTo: "Project Manager",
        priority: "high",
        dependencies: []
      },
      {
        title: "UI/UX Design",
        description: "Create wireframes and visual design for all pages",
        assignedRoleTo: "Frontend",
        priority: "high",
        dependencies: ["Project Planning"]
      },
      {
        title: "Content Strategy",
        description: "Develop content plan and SEO strategy",
        assignedRoleTo: "Content",
        priority: "high",
        dependencies: ["Project Planning"]
      },
      {
        title: "Frontend Development - Homepage",
        description: "Implement homepage with hero section, services overview, and call-to-action",
        assignedRoleTo: "Frontend",
        priority: "high",
        dependencies: ["UI/UX Design"]
      },
      {
        title: "Frontend Development - About Pages",
        description: "Implement about, team, and company history pages",
        assignedRoleTo: "Frontend",
        priority: "medium",
        dependencies: ["UI/UX Design"]
      },
      {
        title: "Frontend Development - Services Pages",
        description: "Implement services/products pages with detailed information",
        assignedRoleTo: "Frontend",
        priority: "medium",
        dependencies: ["UI/UX Design"]
      },
      {
        title: "Frontend Development - Contact Page",
        description: "Implement contact page with form and map integration",
        assignedRoleTo: "Frontend",
        priority: "medium",
        dependencies: ["UI/UX Design"]
      },
      {
        title: "Frontend Development - Blog/News",
        description: "Implement blog listing and detail pages",
        assignedRoleTo: "Frontend",
        priority: "medium",
        dependencies: ["UI/UX Design"]
      },
      {
        title: "Backend Development - Contact Form",
        description: "Create API for contact form submission with email notification",
        assignedRoleTo: "Backend",
        priority: "medium",
        dependencies: []
      },
      {
        title: "Backend Development - CMS Integration",
        description: "Implement content management system for blog and dynamic content",
        assignedRoleTo: "Backend",
        priority: "medium",
        dependencies: []
      },
      {
        title: "Content Creation - Company Information",
        description: "Write company overview, history, and team bios",
        assignedRoleTo: "Content",
        priority: "high",
        dependencies: ["Content Strategy"]
      },
      {
        title: "Content Creation - Services",
        description: "Write detailed service/product descriptions optimized for SEO",
        assignedRoleTo: "Content",
        priority: "high",
        dependencies: ["Content Strategy"]
      },
      {
        title: "Content Creation - Blog Articles",
        description: "Write initial blog articles to populate the news section",
        assignedRoleTo: "Content",
        priority: "medium",
        dependencies: ["Content Strategy"]
      },
      {
        title: "SEO Implementation",
        description: "Implement meta tags, structured data, and site optimization",
        assignedRoleTo: "Content",
        priority: "high",
        dependencies: ["Frontend Development - Homepage", "Content Creation - Company Information", "Content Creation - Services"]
      }
    ]
  },
  {
    name: "Blog Platform",
    description: "Content-focused blog with articles, categories, comments, and user accounts",
    type: "blog",
    requirements: `
- Clean, readable layout focused on content
- Article categorization and tagging
- Search functionality
- User authentication for commenting
- Comment and discussion system
- Social sharing integration
- SEO optimization
- Responsive design
- Analytics integration
    `,
    estimatedDuration: 14, // days
    suggestedAgents: ["Project Manager", "Frontend", "Backend", "Content"],
    defaultTasks: [
      {
        title: "Project Planning",
        description: "Define project goals, content structure, and feature set",
        assignedRoleTo: "Project Manager",
        priority: "high",
        dependencies: []
      },
      {
        title: "UI/UX Design",
        description: "Create wireframes and visual design for blog layout and components",
        assignedRoleTo: "Frontend",
        priority: "high",
        dependencies: ["Project Planning"]
      },
      {
        title: "Content Strategy",
        description: "Develop content plan, categories, and SEO strategy",
        assignedRoleTo: "Content",
        priority: "high",
        dependencies: ["Project Planning"]
      },
      {
        title: "Frontend Development - Homepage",
        description: "Implement blog homepage with featured articles and navigation",
        assignedRoleTo: "Frontend",
        priority: "high",
        dependencies: ["UI/UX Design"]
      },
      {
        title: "Frontend Development - Article Page",
        description: "Implement article detail page with content, author info, and comments",
        assignedRoleTo: "Frontend",
        priority: "high",
        dependencies: ["UI/UX Design"]
      },
      {
        title: "Frontend Development - Category/Tag Pages",
        description: "Implement category and tag filtered pages",
        assignedRoleTo: "Frontend",
        priority: "medium",
        dependencies: ["UI/UX Design"]
      },
      {
        title: "Frontend Development - User Authentication",
        description: "Implement login, registration, and profile pages",
        assignedRoleTo: "Frontend",
        priority: "medium",
        dependencies: ["UI/UX Design"]
      },
      {
        title: "Backend Development - Database Design",
        description: "Design database schema for articles, users, comments, and categories",
        assignedRoleTo: "Backend",
        priority: "high",
        dependencies: ["Project Planning"]
      },
      {
        title: "Backend Development - API",
        description: "Create RESTful API endpoints for articles, comments, and user management",
        assignedRoleTo: "Backend",
        priority: "high",
        dependencies: ["Backend Development - Database Design"]
      },
      {
        title: "Backend Development - Authentication",
        description: "Implement user authentication and authorization system",
        assignedRoleTo: "Backend",
        priority: "high",
        dependencies: ["Backend Development - Database Design"]
      },
      {
        title: "Backend Development - Search",
        description: "Implement search functionality with filtering and sorting",
        assignedRoleTo: "Backend",
        priority: "medium",
        dependencies: ["Backend Development - API"]
      },
      {
        title: "Content Creation - Sample Articles",
        description: "Write initial articles to populate the blog",
        assignedRoleTo: "Content",
        priority: "medium",
        dependencies: ["Content Strategy"]
      },
      {
        title: "SEO Implementation",
        description: "Implement meta tags, structured data, and site optimization",
        assignedRoleTo: "Content",
        priority: "high",
        dependencies: ["Frontend Development - Homepage", "Frontend Development - Article Page"]
      },
      {
        title: "Analytics Integration",
        description: "Integrate analytics tracking to monitor traffic and engagement",
        assignedRoleTo: "Frontend",
        priority: "low",
        dependencies: ["Frontend Development - Homepage"]
      }
    ]
  },
  {
    name: "Admin Dashboard",
    description: "Administrative interface for managing users, content, and business operations",
    type: "admin",
    requirements: `
- Secure authentication and authorization
- User management with roles and permissions
- Data visualization with charts and reports
- CRUD operations for business entities
- Activity logging and audit trails
- Search and filtering functionality
- Responsive layout for desktop and tablet
- Notifications and alerts system
- Export functionality for reports
    `,
    estimatedDuration: 21, // days
    suggestedAgents: ["Project Manager", "Architect", "Frontend", "Backend", "Testing"],
    defaultTasks: [
      {
        title: "Project Planning and Architecture",
        description: "Define project scope, feature set, and technical architecture",
        assignedRoleTo: "Architect",
        priority: "high",
        dependencies: []
      },
      {
        title: "UI/UX Design",
        description: "Create wireframes and visual design for dashboard components",
        assignedRoleTo: "Frontend",
        priority: "high",
        dependencies: ["Project Planning and Architecture"]
      },
      {
        title: "Backend Development - Database Design",
        description: "Design database schema for users, permissions, and business entities",
        assignedRoleTo: "Backend",
        priority: "high",
        dependencies: ["Project Planning and Architecture"]
      },
      {
        title: "Backend Development - Authentication",
        description: "Implement secure authentication and authorization system",
        assignedRoleTo: "Backend",
        priority: "high",
        dependencies: ["Backend Development - Database Design"]
      },
      {
        title: "Backend Development - API Framework",
        description: "Create RESTful API foundation with security middleware",
        assignedRoleTo: "Backend",
        priority: "high",
        dependencies: ["Backend Development - Authentication"]
      },
      {
        title: "Backend Development - Business Logic",
        description: "Implement business logic and data processing",
        assignedRoleTo: "Backend",
        priority: "high",
        dependencies: ["Backend Development - API Framework"]
      },
      {
        title: "Frontend Development - Authentication UI",
        description: "Implement login, registration, and password recovery screens",
        assignedRoleTo: "Frontend",
        priority: "high",
        dependencies: ["UI/UX Design", "Backend Development - Authentication"]
      },
      {
        title: "Frontend Development - Dashboard Layout",
        description: "Implement main dashboard layout with navigation and widgets",
        assignedRoleTo: "Frontend",
        priority: "high",
        dependencies: ["UI/UX Design"]
      },
      {
        title: "Frontend Development - Data Tables",
        description: "Implement data tables with sorting, filtering, and pagination",
        assignedRoleTo: "Frontend",
        priority: "medium",
        dependencies: ["Frontend Development - Dashboard Layout", "Backend Development - API Framework"]
      },
      {
        title: "Frontend Development - Forms",
        description: "Implement forms for data entry and editing with validation",
        assignedRoleTo: "Frontend",
        priority: "medium",
        dependencies: ["Frontend Development - Dashboard Layout", "Backend Development - API Framework"]
      },
      {
        title: "Frontend Development - Data Visualization",
        description: "Implement charts and graphs for data visualization",
        assignedRoleTo: "Frontend",
        priority: "medium",
        dependencies: ["Frontend Development - Dashboard Layout", "Backend Development - Business Logic"]
      },
      {
        title: "Frontend Development - User Management",
        description: "Implement user management interface with roles and permissions",
        assignedRoleTo: "Frontend",
        priority: "medium",
        dependencies: ["Frontend Development - Data Tables", "Frontend Development - Forms"]
      },
      {
        title: "Backend Development - Reporting",
        description: "Implement reporting API with export functionality",
        assignedRoleTo: "Backend",
        priority: "medium",
        dependencies: ["Backend Development - Business Logic"]
      },
      {
        title: "Backend Development - Notifications",
        description: "Implement notification system with real-time updates",
        assignedRoleTo: "Backend",
        priority: "low",
        dependencies: ["Backend Development - API Framework"]
      },
      {
        title: "Frontend Development - Notifications UI",
        description: "Implement notification display and management interface",
        assignedRoleTo: "Frontend",
        priority: "low",
        dependencies: ["Backend Development - Notifications"]
      },
      {
        title: "Testing - Security Testing",
        description: "Perform security testing for authentication and authorization",
        assignedRoleTo: "Testing",
        priority: "high",
        dependencies: ["Backend Development - Authentication", "Frontend Development - Authentication UI"]
      },
      {
        title: "Testing - Functional Testing",
        description: "Perform functional testing for all dashboard components",
        assignedRoleTo: "Testing",
        priority: "high",
        dependencies: ["Frontend Development - User Management", "Backend Development - Reporting"]
      }
    ]
  },
  {
    name: "Landing Page",
    description: "Conversion-focused landing page for product promotion or lead generation",
    type: "landing",
    requirements: `
- Attention-grabbing hero section
- Clear value proposition
- Product/service features and benefits
- Social proof (testimonials, logos, reviews)
- Call-to-action buttons
- Lead capture form
- Mobile-first responsive design
- Fast loading performance
- Analytics tracking
    `,
    estimatedDuration: 7, // days
    suggestedAgents: ["Project Manager", "Frontend", "Content"],
    defaultTasks: [
      {
        title: "Project Planning",
        description: "Define project goals, target audience, and conversion objectives",
        assignedRoleTo: "Project Manager",
        priority: "high",
        dependencies: []
      },
      {
        title: "Content Strategy",
        description: "Develop messaging, value proposition, and call-to-action plan",
        assignedRoleTo: "Content",
        priority: "high",
        dependencies: ["Project Planning"]
      },
      {
        title: "UI/UX Design",
        description: "Create wireframes and visual design for landing page",
        assignedRoleTo: "Frontend",
        priority: "high",
        dependencies: ["Content Strategy"]
      },
      {
        title: "Content Creation - Headlines and Copy",
        description: "Write compelling headlines, subheadlines, and body copy",
        assignedRoleTo: "Content",
        priority: "high",
        dependencies: ["Content Strategy"]
      },
      {
        title: "Content Creation - Testimonials",
        description: "Collect and format customer testimonials and social proof",
        assignedRoleTo: "Content",
        priority: "medium",
        dependencies: ["Content Strategy"]
      },
      {
        title: "Frontend Development - Hero Section",
        description: "Implement hero section with headline, subheadline, and primary CTA",
        assignedRoleTo: "Frontend",
        priority: "high",
        dependencies: ["UI/UX Design", "Content Creation - Headlines and Copy"]
      },
      {
        title: "Frontend Development - Features Section",
        description: "Implement product/service features and benefits section",
        assignedRoleTo: "Frontend",
        priority: "high",
        dependencies: ["UI/UX Design", "Content Creation - Headlines and Copy"]
      },
      {
        title: "Frontend Development - Testimonials Section",
        description: "Implement testimonials and social proof section",
        assignedRoleTo: "Frontend",
        priority: "medium",
        dependencies: ["UI/UX Design", "Content Creation - Testimonials"]
      },
      {
        title: "Frontend Development - Lead Form",
        description: "Implement lead capture form with validation",
        assignedRoleTo: "Frontend",
        priority: "high",
        dependencies: ["UI/UX Design"]
      },
      {
        title: "Frontend Development - Mobile Optimization",
        description: "Ensure responsive design and mobile optimization",
        assignedRoleTo: "Frontend",
        priority: "high",
        dependencies: [
          "Frontend Development - Hero Section",
          "Frontend Development - Features Section",
          "Frontend Development - Testimonials Section",
          "Frontend Development - Lead Form"
        ]
      },
      {
        title: "Performance Optimization",
        description: "Optimize page load speed, images, and assets",
        assignedRoleTo: "Frontend",
        priority: "medium",
        dependencies: ["Frontend Development - Mobile Optimization"]
      },
      {
        title: "Analytics Integration",
        description: "Implement conversion tracking and analytics",
        assignedRoleTo: "Frontend",
        priority: "medium",
        dependencies: ["Frontend Development - Lead Form"]
      },
      {
        title: "SEO Implementation",
        description: "Implement meta tags and SEO optimization",
        assignedRoleTo: "Content",
        priority: "medium",
        dependencies: ["Content Creation - Headlines and Copy"]
      }
    ]
  }
];
