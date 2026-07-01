declare module "lunar-javascript" {
  export const Lunar: {
    fromYmd(year: number, month: number, day: number): {
      getSolar(): {
        toYmd(): string;
      };
    };
  };
}
