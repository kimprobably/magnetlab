// Notion API Client for MagnetLab
// OAuth integration for publishing lead magnets to Notion

import { Client } from '@notionhq/client';
import type { ExtractedContent } from '@/lib/types/lead-magnet';

export interface NotionConfig {
  accessToken: string;
}

export interface NotionPage {
  id: string;
  title: string;
  icon?: string;
  url: string;
  parentId?: string;
}

export interface NotionSearchResult {
  pages: NotionPage[];
  hasMore: boolean;
  nextCursor?: string;
}

export class NotionClient {
  private client: Client;

  constructor(config: NotionConfig) {
    this.client = new Client({
      auth: config.accessToken,
    });
  }

  /**
   * Search for pages the user has access to
   */
  async searchPages(query?: string, pageSize = 10): Promise<NotionSearchResult> {
    const response = await this.client.search({
      query,
      filter: { property: 'object', value: 'page' },
      page_size: pageSize,
    });

    const pages: NotionPage[] = response.results
      .filter((result): result is Extract<typeof result, { object: 'page' }> =>
        result.object === 'page'
      )
      .map((page) => {
        // Get title from properties
        let title = 'Untitled';
        if ('properties' in page && page.properties.title) {
          const titleProp = page.properties.title;
          if ('title' in titleProp && Array.isArray(titleProp.title) && titleProp.title[0]) {
            title = titleProp.title[0].plain_text || 'Untitled';
          }
        }

        // Get icon
        let icon: string | undefined;
        if ('icon' in page && page.icon) {
          if (page.icon.type === 'emoji') {
            icon = page.icon.emoji;
          }
        }

        return {
          id: page.id,
          title,
          icon,
          url: 'url' in page ? page.url : '',
          parentId: 'parent' in page && page.parent.type === 'page_id'
            ? page.parent.page_id
            : undefined,
        };
      });

    return {
      pages,
      hasMore: response.has_more,
      nextCursor: response.next_cursor || undefined,
    };
  }

  /**
   * Create a new page with lead magnet content
   */
  async createLeadMagnetPage(
    parentPageId: string,
    content: ExtractedContent,
    icon?: string
  ): Promise<NotionPage> {
    // Build the page content blocks
    const children: Parameters<Client['pages']['create']>[0]['children'] = [];

    // Add intro callout
    children.push({
      type: 'callout',
      callout: {
        rich_text: [{ type: 'text', text: { content: content.nonObviousInsight } }],
        icon: { type: 'emoji', emoji: '💡' },
        color: 'blue_background',
      },
    });

    // Add each section
    for (const section of content.structure) {
      // Section heading
      children.push({
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: section.sectionName } }],
        },
      });

      // Section content as bulleted list
      for (const item of section.contents) {
        children.push({
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [{ type: 'text', text: { content: item } }],
          },
        });
      }
    }

    // Add divider
    children.push({ type: 'divider', divider: {} });

    // Add proof section
    children.push({
      type: 'heading_3',
      heading_3: {
        rich_text: [{ type: 'text', text: { content: 'Results & Proof' } }],
      },
    });

    children.push({
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: content.proof } }],
      },
    });

    // Add common mistakes section
    if (content.commonMistakes.length > 0) {
      children.push({
        type: 'heading_3',
        heading_3: {
          rich_text: [{ type: 'text', text: { content: 'Common Mistakes to Avoid' } }],
        },
      });

      for (const mistake of content.commonMistakes) {
        children.push({
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [{ type: 'text', text: { content: mistake } }],
          },
        });
      }
    }

    // Create the page
    const response = await this.client.pages.create({
      parent: { page_id: parentPageId },
      icon: icon ? { type: 'emoji', emoji: icon as Parameters<Client['pages']['create']>[0]['icon'] extends { emoji: infer E } ? E : never } : undefined,
      properties: {
        title: {
          title: [{ type: 'text', text: { content: content.title } }],
        },
      },
      children,
    });

    // Get title from response
    let title = content.title;
    if ('properties' in response && response.properties.title) {
      const titleProp = response.properties.title;
      if ('title' in titleProp && Array.isArray(titleProp.title) && titleProp.title[0]) {
        title = titleProp.title[0].plain_text || content.title;
      }
    }

    return {
      id: response.id,
      title,
      icon: icon,
      url: 'url' in response ? response.url : '',
      parentId: parentPageId,
    };
  }

  /**
   * Get info about the current workspace/bot
   */
  async getWorkspaceInfo(): Promise<{
    botId: string;
    workspaceName?: string;
    workspaceIcon?: string;
  }> {
    const me = await this.client.users.me({});
    return {
      botId: me.id,
      workspaceName: me.name || undefined,
      workspaceIcon: me.avatar_url || undefined,
    };
  }

  /**
   * Verify the connection is working
   */
  async verifyConnection(): Promise<{ connected: boolean; error?: string }> {
    try {
      await this.client.users.me({});
      return { connected: true };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// =============================================================================
// OAUTH HELPERS
// =============================================================================

export function getNotionOAuthUrl(state: string): string {
  const clientId = process.env.NOTION_CLIENT_ID;
  const redirectUri = process.env.NOTION_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error('Notion OAuth not configured');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    owner: 'user',
    state,
  });

  return `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
}

export async function exchangeNotionCode(code: string): Promise<{
  access_token: string;
  workspace_id: string;
  workspace_name?: string;
  workspace_icon?: string;
  bot_id: string;
}> {
  const clientId = process.env.NOTION_CLIENT_ID;
  const clientSecret = process.env.NOTION_CLIENT_SECRET;
  const redirectUri = process.env.NOTION_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Notion OAuth not configured');
  }

  const response = await fetch('https://api.notion.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Notion OAuth error: ${error}`);
  }

  const data = await response.json();

  return {
    access_token: data.access_token,
    workspace_id: data.workspace_id,
    workspace_name: data.workspace_name,
    workspace_icon: data.workspace_icon,
    bot_id: data.bot_id,
  };
}
