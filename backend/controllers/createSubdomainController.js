import { Route53Client, ChangeResourceRecordSetsCommand } from "@aws-sdk/client-route-53";

const route53 = new Route53Client({
  region: "us-east-1", // Route53 é global, mas SDK exige região
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

export async function createSubdomainController(req, res) {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({ error: "Slug não informado" });
    }

    const subdomain = `${slug}.marcafy.com.br`;

    const params = {
      HostedZoneId: process.env.AWS_HOSTED_ZONE_ID,
      ChangeBatch: {
        Comment: `Criando subdomínio para ${slug}`,
        Changes: [
          {
            Action: "UPSERT",
            ResourceRecordSet: {
              Name: subdomain,
              Type: "CNAME",
              TTL: 300,
              ResourceRecords: [
                { Value: "www.marcafy.com.br" }
              ]
            }
          }
        ]
      }
    };

    const command = new ChangeResourceRecordSetsCommand(params);
    await route53.send(command);

    return res.status(201).json({
      message: "Subdomínio criado com sucesso",
      subdomain,
      target: "www.marcafy.com.br"
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Erro ao criar subdomínio",
      details: error.message
    });
  }
}
