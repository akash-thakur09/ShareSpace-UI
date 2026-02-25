// src/fluid/container.ts
import { AzureClient } from "@fluidframework/azure-client";
import { InsecureTokenProvider } from "@fluidframework/test-runtime-utils/internal";
import { fluidSchema } from "./schema";
import type { IFluidContainer } from "fluid-framework";

const client = new AzureClient({
  connection: {
    type: "local",
    endpoint: "http://localhost:7070",
    tokenProvider: new InsecureTokenProvider("local-user", {
      id: "local-user",
      name: "Local User"
    })
  }
});

export async function getFluidContainer(
  containerId?: string
): Promise<{
  container: IFluidContainer;
  containerId: string;
}> {
  if (containerId) {
    const result = await client.getContainer(containerId, fluidSchema, "2");
    return {
      container: result.container,
      containerId
    };
  }

  const result = await client.createContainer(fluidSchema, "2");
  const newContainerId = await result.container.attach();

  return {
    container: result.container,
    containerId: newContainerId
  };
}