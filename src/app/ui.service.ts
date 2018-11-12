import { Injectable } from '@angular/core';
import { MatSidenav, MatDrawerToggleResult, MatSnackBar } from '@angular/material';

@Injectable({ providedIn: 'root' })
export class UiService {

  private sidenav: MatSidenav;

  constructor(private snackBar: MatSnackBar) { }

  public setSidenav(sidenav: MatSidenav) {
    this.sidenav = sidenav;
  }

  public openSidenav(): Promise<MatDrawerToggleResult> {
    return this.sidenav.open();
  }

  public notify(message: string, actionName: string, actionFunction: () => void) {
    const snackBarRef = this.snackBar.open(message, actionName, {
      duration: 3000
    });
    snackBarRef.onAction().subscribe(actionFunction);
  }

  public warn(message: string) {
    this.snackBar.open(message, '', { duration: 3000 });
  }
}