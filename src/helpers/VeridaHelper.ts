/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client, Context, Utils, Messaging } from "@verida/client-ts";
import { Credentials } from "@verida/verifiable-credentials";
import { EventEmitter } from "events";
import { Profile } from "@/interface";
import { Buffer } from "buffer";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { config } from "@/config";

dayjs.extend(utc);

const userConfig = {
  environment: config.veridaEnv,
  didServerUrl: config.veridaTestnetDefaultDidServerUrl,
};

class VeridaHelper extends EventEmitter {
  private client: Client;
  public profile?: Profile;
  public context: Context | undefined;
  private did: string;
  public connected?: boolean;
  public credentials: any;
  public didDocument: any;
  private _messagingInstance: Messaging | undefined;
  on: any;

  constructor(config: any) {
    super();
    this.client = new Client(config);
    this.did = "";
    this.context = undefined;
  }

  public async connect(context: Context): Promise<void> {
    this.context = context;
    this.did = await context.getAccount().did();

    if (this.context) {
      this.connected = true;
    }
  }

  async getProfile(did: string, contextName?: string): Promise<any> {
    const profileContextName =
      contextName || (config.veridaVaulContextName as string);

    const profileInstance = await this.client.openPublicProfile(
      did,
      profileContextName,
      "basicProfile"
    );
    if (profileInstance) {
      this.profile = await profileInstance.getMany({}, {});
      if (this.profile) {
        this.profile.did = did;
      }
    }

    return this.profile;
  }

  private async initialiseMessagingInstance(): Promise<Messaging> {
    if (this._messagingInstance) {
      return this._messagingInstance;
    }

    if (this.context) {
      this._messagingInstance = await this.context.getMessaging();
    }

    throw new Error("No app context");
  }

  public async sendMessage(messageData: any): Promise<boolean> {
    const type = "inbox/type/dataSend";
    const data = {
      data: [messageData],
    };
    const config = {
      did: this.did,
      recipientContextName: "Verida: Vault",
    };

    const messaging = await this.initialiseMessagingInstance();
    const subject = `New Contact: ${messageData.firstName}`;
    await messaging.send(this.did, type, data, subject, config);
    return true;
  }

  public async getSchemaSpecs(schema: string, context: Context): Promise<any> {
    const schemas = await context.getClient().getSchema(schema);

    const json = await schemas.getSpecification();

    return json;
  }

  hasCredentialExpired(credentials: any): boolean {
    const vc = credentials.verifiableCredential;
    if (vc.expirationDate) {
      // Ensure credential hasn't expired
      const now = dayjs(new Date().toISOString()).utc(true);
      const expDate = dayjs(vc.expirationDate).utc(true);

      if (expDate.diff(now) < 0) {
        return true;
      }
    }
    return false;
  }

  async readVerifiedCredential(uri: string) {
    const decodedURI = Buffer.from(uri, "base64").toString("utf8");

    const url = Utils.explodeVeridaUri(decodedURI);

    const context = await this.client.openExternalContext(
      url.contextName,
      url.did
    );

    const jwt = await Utils.fetchVeridaUri(decodedURI, context);

    const decodedPresentation = await Credentials.verifyPresentation(jwt, {});

    // Retrieve the verifiable credential within the presentation
    const verifiableCredential =
      decodedPresentation.verifiablePresentation.verifiableCredential[0];

    let veridaContextName;

    //TODO:  This is a temporary fix , see reference ticket  https://github.com/verida/verida-js/issues/207
    if (
      verifiableCredential.vc.veridaContextName === "Verida: Credential Manager"
    ) {
      veridaContextName = verifiableCredential.vc.veridaContextName;
    }

    const issuerProfile = await this.getProfile(
      verifiableCredential.vc.issuer,
      veridaContextName
    );

    const subjectProfile = await this.getProfile(verifiableCredential.vc.sub);

    const schemaSpec = await this.getSchemaSpecs(
      verifiableCredential.credentialSubject.schema,
      context
    );

    const publicUri = `${window.origin}/credential?uri=${uri}`;

    return {
      publicUri,
      schemaSpec,
      issuerProfile,
      subjectProfile,
      verifiableCredential,
    };
  }
  async getDidDocument(did: string): Promise<void> {
    const didClient = this.client.didClient;
    const document = await didClient.get(did);
    this.didDocument = document;
  }

  logout(): void {
    this.context = undefined;
    this.connected = false;
    this.did = "";
    this._messagingInstance = undefined;
  }
}

const veridaHelper = new VeridaHelper(userConfig);

export default veridaHelper;
