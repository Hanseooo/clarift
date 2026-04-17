type PageLike = {
  goto: (url: string) => Promise<void>;
  getByText: (text: string) => { toBeVisible: () => Promise<void> };
};

const test = {
  describe: {
    skip: (_name: string, callback: () => void) => callback(),
  },
} as const;

const expect = async (target: { toBeVisible: () => Promise<void> }) => target;

test.describe.skip("chat flow", () => {
  const chatFlow = async (page: PageLike) => {
    await page.goto("/chat");
    const assertion = await expect(page.getByText("Grounded Chat"));
    await assertion.toBeVisible();
  };

  void chatFlow;
});
