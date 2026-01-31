"use client";

import { useEffect } from "react";

export default function OrganizationSchema({ organization, slug }) {
  useEffect(() => {
    if (!organization) return;

    const schema = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: organization.name,
      image: organization.logo_organization,
      url: `https://www.marcafy.com.br/${slug}`,
      telephone: organization.phone || "",
      address: organization.address ? {
        "@type": "PostalAddress",
        streetAddress: organization.address,
        addressLocality: organization.city || "",
        addressRegion: organization.state || "",
        postalCode: organization.zipcode || "",
        addressCountry: "BR",
      } : undefined,
      priceRange: "$$",
      openingHoursSpecification: organization.business_hours ? 
        Object.entries(organization.business_hours).map(([day, hours]) => ({
          "@type": "OpeningHoursSpecification",
          dayOfWeek: day,
          opens: hours.open,
          closes: hours.close,
        })) : undefined,
      sameAs: [
        organization.instagram_url,
        organization.facebook_url,
        organization.website_url,
      ].filter(Boolean),
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Serviços",
        itemListElement: organization.services?.map((service, index) => ({
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: service.name_service,
            description: service.description_service || "",
            price: service.value_service,
            priceCurrency: "BRL",
          },
          position: index + 1,
        })) || [],
      },
    };

    // Remove propriedades undefined
    const cleanSchema = JSON.parse(JSON.stringify(schema));

    // Injeta ou atualiza o script
    let scriptTag = document.getElementById("organization-schema");
    if (scriptTag) {
      scriptTag.textContent = JSON.stringify(cleanSchema);
    } else {
      scriptTag = document.createElement("script");
      scriptTag.id = "organization-schema";
      scriptTag.type = "application/ld+json";
      scriptTag.textContent = JSON.stringify(cleanSchema);
      document.head.appendChild(scriptTag);
    }

    return () => {
      const script = document.getElementById("organization-schema");
      if (script) script.remove();
    };
  }, [organization, slug]);

  return null;
}
