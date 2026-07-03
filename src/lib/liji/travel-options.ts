import { countInclusiveDays } from "./calendar";

export type TravelQuoteCandidate = {
  id: string;
  category: "transport" | "hotel";
  provider: "携程" | "同程";
  title: string;
  amountCny: number;
  score: number;
  distanceKm?: number;
  durationHours?: number;
  rationale: string;
  url: string;
};

export type TravelQuotePlan = {
  candidates: TravelQuoteCandidate[];
  selected: {
    transport: TravelQuoteCandidate;
    hotel: TravelQuoteCandidate;
  };
  totalCny: number;
  dailyLimitCny: number;
  days: number;
  warnings: string[];
  alternatives: string[];
};

function searchUrl(provider: "携程" | "同程", query: string) {
  if (provider === "同程") {
    return `https://www.ly.com/?keyword=${encodeURIComponent(query)}`;
  }
  return `https://www.ctrip.com/?keyword=${encodeURIComponent(query)}`;
}

function defaultTransportCandidates(destination: string): TravelQuoteCandidate[] {
  const isGuangzhou = destination.includes("广州");
  return [
    {
      id: "transport-rail-evening",
      category: "transport",
      provider: "携程",
      title: `${destination}晚间高铁二等座`,
      amountCny: isGuangzhou ? 640 : 560,
      score: 86,
      durationHours: isGuangzhou ? 4.6 : 3.8,
      rationale: "5 小时内优先高铁，晚间班次通常价格更稳。",
      url: searchUrl("携程", `${destination} 高铁 晚间`),
    },
    {
      id: "transport-flight-flex",
      category: "transport",
      provider: "携程",
      title: `${destination}灵活时段机票`,
      amountCny: isGuangzhou ? 1180 : 980,
      score: 78,
      durationHours: 2.4,
      rationale: "适合压缩路途时间，但需关注临近出行涨价。",
      url: searchUrl("携程", `${destination} 机票 灵活时段`),
    },
    {
      id: "transport-rail-business",
      category: "transport",
      provider: "同程",
      title: `${destination}商务座/一等座备选`,
      amountCny: isGuangzhou ? 1380 : 1160,
      score: 72,
      durationHours: isGuangzhou ? 4.6 : 3.8,
      rationale: "舒适度更高，仅在预算充裕时推荐。",
      url: searchUrl("同程", `${destination} 高铁 一等座`),
    },
  ];
}

function defaultHotelCandidates(destination: string, nights: number): TravelQuoteCandidate[] {
  const safeNights = Math.max(1, nights);
  return [
    {
      id: "hotel-near-client",
      category: "hotel",
      provider: "携程",
      title: `${destination}客户地址 3 公里内高评分酒店`,
      amountCny: 680 * safeNights,
      score: 91,
      distanceKm: 2.4,
      rationale: "优先靠近拜访地址，减少市内交通和迟到风险。",
      url: searchUrl("携程", `${destination} 3公里 高评分 商务酒店`),
    },
    {
      id: "hotel-chain-business",
      category: "hotel",
      provider: "携程",
      title: `${destination}连锁商务酒店`,
      amountCny: 460 * safeNights,
      score: 83,
      distanceKm: 4.8,
      rationale: "预算压力较大时的稳妥替代，牺牲少量通勤距离。",
      url: searchUrl("携程", `${destination} 连锁 商务酒店`),
    },
    {
      id: "hotel-premium",
      category: "hotel",
      provider: "同程",
      title: `${destination}高端行政酒店`,
      amountCny: 980 * safeNights,
      score: 88,
      distanceKm: 2.9,
      rationale: "适合重要客户会面或接待，但预算占用较高。",
      url: searchUrl("同程", `${destination} 高端 行政酒店`),
    },
  ];
}

function chooseBest(candidates: TravelQuoteCandidate[], limitCny: number) {
  const affordable = candidates
    .filter((candidate) => candidate.amountCny <= limitCny)
    .sort((left, right) => right.score - left.score);

  return affordable[0] ?? [...candidates].sort((left, right) => left.amountCny - right.amountCny)[0];
}

export function buildTravelQuotePlan(input: {
  destination: string;
  startDate: string;
  endDate?: string;
  dailyLimitCny?: number;
  transportCandidates?: TravelQuoteCandidate[];
  hotelCandidates?: TravelQuoteCandidate[];
}): TravelQuotePlan {
  const days = countInclusiveDays(input.startDate, input.endDate);
  const nights = Math.max(1, days - 1);
  const dailyLimitCny = input.dailyLimitCny ?? 2400;
  const totalLimit = days * dailyLimitCny;
  const transportCandidates = input.transportCandidates?.length
    ? input.transportCandidates
    : defaultTransportCandidates(input.destination);
  const hotelCandidates = input.hotelCandidates?.length
    ? input.hotelCandidates
    : defaultHotelCandidates(input.destination, nights);
  const transport = chooseBest(transportCandidates, totalLimit * 0.35);
  const hotel = chooseBest(hotelCandidates, totalLimit * 0.5);
  const committed = transport.amountCny + hotel.amountCny;
  const warnings: string[] = [];
  const alternatives: string[] = [];

  if (committed > totalLimit * 0.8) {
    warnings.push("交通与住宿占比超过 80%，弹性餐饮/打车空间不足。");
  }

  if (committed > totalLimit) {
    warnings.push("当前交通与住宿报价已超出差旅总限额。");
    alternatives.push("选择晚间高铁或更早出发班次，降低大交通成本。");
    alternatives.push("将酒店降级为连锁商务酒店，并接受 3-5 公里通勤。");
  } else if (transport.amountCny > totalLimit * 0.35) {
    alternatives.push("若机票临近涨价，可优先切换晚间高铁。");
  }

  if (hotel.distanceKm && hotel.distanceKm > 3) {
    alternatives.push("当前酒店超过 3 公里，建议预留打车时间或切回近客户地址酒店。");
  }

  return {
    candidates: [...transportCandidates, ...hotelCandidates],
    selected: { transport, hotel },
    totalCny: totalLimit,
    dailyLimitCny,
    days,
    warnings,
    alternatives,
  };
}
