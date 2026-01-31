import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/server/auth";

type AttioAttribute = {
  id: string;
  title: string;
  type: string;
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ATTIO_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Attio API key not configured" }, { status: 500 });
  }

  try {
    // Fetch the deal object attributes from Attio
    const res = await fetch("https://api.attio.com/v2/objects/deals/attributes", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[attio/deal-attributes] Attio API error:", res.status, errorText);
      return NextResponse.json({ error: "Failed to fetch deal attributes from Attio" }, { status: 500 });
    }

    const data = await res.json();
    
    // Extract attributes - focus on checkbox type for boolean rules
    const attributes: AttioAttribute[] = [];
    
    // Attio returns { data: [...attributes...] }
    const attrList = Array.isArray(data?.data) ? data.data : 
                     Array.isArray(data) ? data : [];
    
    for (const attr of attrList) {
      // Include checkbox attributes (boolean) that can be mapped to bonus rules
      // Attio checkbox type is "checkbox", but also support "select" for multi-option fields
      if (attr.type === "checkbox" || attr.type === "select") {
        attributes.push({
          id: attr.api_slug || attr.id?.attribute_id || attr.id,
          title: attr.title || attr.name || attr.api_slug,
          type: attr.type,
        });
      }
    }

    // Sort alphabetically by title
    attributes.sort((a, b) => a.title.localeCompare(b.title));

    return NextResponse.json({ attributes });
  } catch (error) {
    console.error("[attio/deal-attributes] Error:", error);
    return NextResponse.json({ error: "Failed to fetch deal attributes" }, { status: 500 });
  }
}
