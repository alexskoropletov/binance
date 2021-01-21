interface Config {
  key: string;
  secret: string;
  recvWindow?: number;
  timeout?: number;
  disableBeautification?: boolean;
  handleDrift?: boolean;
  baseUrl?: string;
  requestOptions?: any;
}

export default Config;