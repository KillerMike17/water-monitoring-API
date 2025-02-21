import admin from 'firebase-admin';
import { EnvVar } from '@/common/config/config.instances';
import { FAIL, Resp, Succeed } from '@/common/constants/return.const';
import { Injectable } from '@nestjs/common';
import { DecodedIdToken } from 'firebase-admin/lib/auth/token-verifier';
import { ServiceAccount } from 'firebase-admin/lib/app/credential';

const fbConfig = {
  type: EnvVar.getInstance.FIREBASE_TYPE,
  project_id: EnvVar.getInstance.FIREBASE_PROJECT_ID,
  private_key: EnvVar.getInstance.FIREBASE_PRIVATE_KEY_STRING,
  private_key_id: EnvVar.getInstance.FIREBASE_PRIVATE_KEY_ID,
  client_email: EnvVar.getInstance.FIREBASE_CLIENT_EMAIL,
  client_id: EnvVar.getInstance.FIREBASE_CLIENT_ID,
  auth_uri: EnvVar.getInstance.FIREBASE_AUTH_URI,
  token_uri: EnvVar.getInstance.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: EnvVar.getInstance.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: EnvVar.getInstance.FIREBASE_CLIENT_X509_CERT_URL,
};

const acc: ServiceAccount = {
  projectId: fbConfig.project_id,
  clientEmail: fbConfig.client_email,
  privateKey: fbConfig.private_key.replace(/\\n/g, '\n'),
  // privateKey: fbConfig.private_key,
};
const FirebaseProjectName = EnvVar.getInstance.FIREBASE_PROJECT_NAME;

// credential: admin.credential.cert(serviceAccount),
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore

admin.initializeApp({
  credential: admin.credential.cert(acc),
  databaseURL: `https://${FirebaseProjectName}.firebaseio.com`,
  storageBucket: `gs://${FirebaseProjectName}.appspot.com`,
});

const storageRef = admin.storage().bucket(`gs://${FirebaseProjectName}.appspot.com`);

const projName = `${FirebaseProjectName}.appspot.com`;
const toBeRemoved = `https://storage.googleapis.com/${projName}/`;
const ToBeAdded = `https://firebasestorage.googleapis.com/v0/b/${projName}/o/`;

@Injectable()
export class FirebaseService implements FileServiceInterface {
  async firebaseVerifyToken(idToken: string): Promise<Resp<DecodedIdToken>> {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      // firebaseId = decodedToken.uid
      console.log('decTOkn=>', decodedToken);
      return Succeed(decodedToken);
    } catch (e) {
      return FAIL(e.message);
    }
  }
}

export interface FileServiceInterface {
  firebaseVerifyToken(token: string): Promise<Resp<any>>;
}

@Injectable()
export class MockFile implements FileServiceInterface {
  firebaseVerifyToken(token: string): Promise<Resp<any>> {
    return Promise.resolve(undefined);
  }
}
