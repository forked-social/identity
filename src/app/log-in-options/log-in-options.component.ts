import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RouteNames } from '../app-routing.module';
import { GlobalVarsService } from '../global-vars.service';
import { GoogleDriveService } from '../google-drive.service';
import { Network } from '../../types/identity';

@Component({
  selector: 'app-log-in-options',
  templateUrl: './log-in-options.component.html',
  styleUrls: ['./log-in-options.component.scss'],
})
export class LogInOptionsComponent implements OnInit {
  constructor(
    private googleDrive: GoogleDriveService,
    private router: Router,
    public globalVars: GlobalVarsService
  ) {}

  ngOnInit(): void {}

  // Google Drive backup is only offered when an OAuth client id is configured
  // (GOOGLE_DRIVE_CLIENT_ID via /env-config.js; empty = keep the option
  // hidden, see google-drive.service.ts).
  get googleDriveConfigured(): boolean {
    return !!GoogleDriveService.CLIENT_ID;
  }

  launchGoogle(): void {
    this.googleDrive.launchGoogle();
  }

  navigateToMetamaskSignup(): void {
    this.router.navigate(['/', RouteNames.SIGN_UP_METAMASK], {
      queryParamsHandling: 'merge',
    });
  }

  navigateToGetDeso(publicKey: string): void {
    this.router.navigate(['/', RouteNames.GET_DESO], {
      queryParamsHandling: 'merge',
      queryParams: { publicKey },
    });
  }
}
