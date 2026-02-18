import { Injectable } from '@nestjs/common';

@Injectable()
export class JoseWrapperService {
  private jose: any;

  async getJose(): Promise<any> {
    if (!this.jose) {
      this.jose = await import('jose');
    }
    return this.jose;
  }

  // For testing purposes - allows mocking
  setJose(mockJose: any): void {
    this.jose = mockJose;
  }
}
