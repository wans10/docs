import { FdrApplication } from "../../app";
import { ParsedBaseUrl } from "../../util/ParsedBaseUrl";
import {
  RevalidatedPathsResponse,
  RevalidatorService,
} from "./RevalidatorService";

export class LocalRevalidatorServiceImpl implements RevalidatorService {
  async revalidate(params: {
    baseUrl: ParsedBaseUrl;
    app: FdrApplication;
    authHeader: string;
  }): Promise<RevalidatedPathsResponse> {
    return {
      successful: [],
      failed: [],
      revalidationFailed: false,
    };
  }
}
