import { NextResponse } from "next/server";

// Alternative.me Crypto Fear & Greed Index API - Free

interface FearGreedData {
  value: string;
  value_classification: string;
  timestamp: string;
  time_until_update: string;
}

export async function GET() {
  try {
    // Fear & Greed Index
    const fgiResponse = await fetch("https://api.alternative.me/fng/?limit=30", {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    const fgiData = await fgiResponse.json();

    // Historical data for chart
    const historical = fgiData.data.map((item: FearGreedData) => ({
      date: new Date(parseInt(item.timestamp) * 1000).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }),
      value: parseInt(item.value),
      classification: item.value_classification,
    }));

    // Current value
    const current = fgiData.data[0];

    // Calculate trends
    const weeklyAvg = historical.slice(0, 7).reduce((sum: number, item: any) => sum + item.value, 0) / 7;
    const monthlyAvg = historical.reduce((sum: number, item: any) => sum + item.value, 0) / historical.length;

    // Trend direction
    const trend = parseInt(fgiData.data[0].value) > parseInt(fgiData.data[1].value) ? "up" : 
                  parseInt(fgiData.data[0].value) < parseInt(fgiData.data[1].value) ? "down" : "neutral";

    // Interpretation
    const getInterpretation = (value: number) => {
      if (value <= 20) return "Extremo Medo - Oportunidade de compra potencial";
      if (value <= 40) return "Medo - Investidores cautelosos";
      if (value <= 60) return "Neutro - Mercado indeciso";
      if (value <= 80) return "Ganância - Otimismo no mercado";
      return "Extrema Ganância - Possível correção próxima";
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      current: {
        value: parseInt(current.value),
        classification: current.value_classification,
        interpretation: getInterpretation(parseInt(current.value)),
        trend,
      },
      averages: {
        weekly: weeklyAvg.toFixed(0),
        monthly: monthlyAvg.toFixed(0),
      },
      historical: historical.reverse(), // Oldest to newest
      breakdown: {
        extremeFear: historical.filter((h: any) => h.value <= 20).length,
        fear: historical.filter((h: any) => h.value > 20 && h.value <= 40).length,
        neutral: historical.filter((h: any) => h.value > 40 && h.value <= 60).length,
        greed: historical.filter((h: any) => h.value > 60 && h.value <= 80).length,
        extremeGreed: historical.filter((h: any) => h.value > 80).length,
      },
      nextUpdate: parseInt(current.time_until_update) * 1000,
    });
  } catch (error) {
    console.error("Error fetching Fear & Greed Index:", error);

    // Generate mock historical data
    const mockHistorical: { date: string; value: number; classification: string }[] = [];
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      mockHistorical.push({
        date: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        value: 40 + Math.floor(Math.random() * 30),
        classification: "Neutral",
      });
    }

    return NextResponse.json({
      success: false,
      error: "Using fallback data",
      fallback: true,
      timestamp: new Date().toISOString(),
      current: {
        value: 55,
        classification: "Greed",
        interpretation: "Otimismo no mercado",
        trend: "up",
      },
      averages: {
        weekly: "52",
        monthly: "48",
      },
      historical: mockHistorical,
      breakdown: {
        extremeFear: 2,
        fear: 5,
        neutral: 12,
        greed: 8,
        extremeGreed: 3,
      },
      nextUpdate: 3600000,
    });
  }
}
