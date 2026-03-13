declare global {
  interface Window {
    puter: {
      ai: {
        chat: (
          messages: Array<{
            role: string;
            content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
          }>,
          options?: { model?: string; stream?: boolean }
        ) => Promise<{ message: { content: string } }>;
      };
    };
  }
}

export {};
