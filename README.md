# BlockchainHB Remote MCP Server

This remote MCP server runs on Cloudflare Workers and provides powerful tools including LinkedIn job scraping capabilities powered by Apify.

## 🚀 Available Tools

### 1. **Calculator Tools**
- `add` - Simple addition (a + b)
- `calculate` - Multi-operation calculator (add, subtract, multiply, divide)

### 2. **LinkedIn Jobs Scraper** 🔥
- `scrape_linkedin_jobs` - Search and extract LinkedIn job listings using the [bebity/linkedin-jobs-scraper](https://apify.com/bebity/linkedin-jobs-scraper) actor

#### LinkedIn Jobs Scraper Parameters:
- **jobTitle** (required): Job title to search for (e.g., "Software Engineer", "Marketing Manager")
- **location** (optional): Location for the job search (e.g., "San Francisco, CA", "Remote")
- **companyName** (optional): Array of company names to filter by
- **experienceLevel** (optional): Filter by experience level (Internship, Entry level, Associate, Mid-Senior level, Director, Executive)
- **jobType** (optional): Employment type filter (Full-time, Part-time, Contract, Temporary, Volunteer, Internship, Other)
- **maxResults** (optional): Maximum number of jobs to return (1-100, default: 10)

#### Example Usage:
```javascript
// Search for Software Engineer jobs in San Francisco
scrape_linkedin_jobs({
  jobTitle: "Software Engineer",
  location: "San Francisco, CA",
  experienceLevel: "Mid-Senior level",
  jobType: "Full-time",
  maxResults: 20
})

// Search for Marketing jobs at specific companies
scrape_linkedin_jobs({
  jobTitle: "Marketing Manager",
  companyName: ["Google", "Microsoft", "Apple"],
  maxResults: 15
})
```

#### Output Format:
Each job listing includes:
- Job title and company name
- Location and posting date
- Direct link to the job posting
- Salary information (when available)
- Workplace type (Remote/On-site/Hybrid)
- Number of applicants

## 🌐 **Deployment**

### **One-Click Deploy:**
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/BlockchainHB/remote-mcp-server-authless)

This will deploy your MCP server to: `https://remote-mcp-server-authless.<your-account>.workers.dev/sse`

### **Manual Deployment:**
```bash
npm create cloudflare@latest -- my-linkedin-mcp-server --template=BlockchainHB/remote-mcp-server-authless
cd my-linkedin-mcp-server
npm run deploy
```

## 🔧 **Configuration**

### **Environment Variables:**
The server requires an Apify API key for LinkedIn job scraping functionality:
- `APIFY_API_KEY`: Your Apify API token

## 🔌 **Connect to MCP Clients**

### **Method 1: Remote Connection (Recommended)**
Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "linkedin-jobs": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://remote-mcp-server-authless.hasaamfba.workers.dev/sse"
      ]
    }
  }
}
```

### **Method 2: Direct Actor Access**
You can also use Apify's built-in MCP server:

```json
{
  "mcpServers": {
    "linkedin-jobs-direct": {
      "command": "npx",
      "args": [
        "-y",
        "@apify/actors-mcp-server",
        "--actors",
        "bebity/linkedin-jobs-scraper"
      ],
      "env": {
        "APIFY_TOKEN": "your_apify_api_key"
      }
    }
  }
}
```

## 🎯 **Use Cases**

### **For Job Seekers:**
- Search for specific roles in target locations
- Monitor job postings at dream companies
- Track application counts and posting dates
- Find remote opportunities

### **For Recruiters:**
- Research salary ranges and competition
- Identify active companies in specific markets
- Track job posting trends
- Find similar roles for benchmarking

### **For Market Research:**
- Analyze job market trends
- Identify growing companies and sectors
- Track hiring patterns
- Competitive intelligence

## 📊 **Cost & Performance**
- **Actor Cost**: ~$0.06 per 1,000 jobs scraped
- **Speed**: Scrapes 1,000 jobs in under 2 minutes
- **Success Rate**: >99% based on Apify actor statistics
- **Built-in Proxy**: Uses residential proxies for reliability

## 🛠️ **Development**

To customize your MCP server, edit the tools in `src/index.ts`. Each tool is defined using the MCP SDK:

```typescript
this.server.tool(
  "your_tool_name",
  { 
    param1: z.string(),
    param2: z.number().optional()
  },
  async ({ param1, param2 }) => {
    // Your tool logic here
    return { content: [{ type: "text", text: "Result" }] };
  }
);
```

## 📚 **Resources**

- [Apify LinkedIn Jobs Scraper](https://apify.com/bebity/linkedin-jobs-scraper)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [MCP Remote Proxy](https://www.npmjs.com/package/mcp-remote)

## 🚀 **Powered By**
- **Cloudflare Workers** - Serverless hosting
- **Apify Platform** - Web scraping infrastructure  
- **Model Context Protocol** - AI agent integration
- **bebity/linkedin-jobs-scraper** - LinkedIn job extraction

---

**Need help?** Open an issue or check the [Cloudflare MCP documentation](https://developers.cloudflare.com/agents/guides/remote-mcp-server/).