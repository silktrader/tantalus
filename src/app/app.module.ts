import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AngularFireModule } from '@angular/fire';
import { environment } from '../environments/environment';

import { AppComponent } from './app.component';
import { CoreModule } from './core/core.module';
import { RoutingModule } from './routing/routing.module';
import { LoginComponent } from './auth/login/login.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CalendarComponent } from './calendar/calendar.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { MaterialModule } from './material/material.module';
import { FoodsComponent } from './foods/foods.component';
import { SignoutComponent } from './auth/signout/signout.component';
import { HeaderComponent } from './header/header.component';
import { NavigationComponent } from './navigation/navigation.component';
import { DiaryComponent } from './diary/diary.component';
import { AddFoodComponent } from './foods/add-food/add-food.component';
import { EditFoodComponent } from './foods/edit-food/edit-food.component';

@NgModule({
    declarations: [
        AppComponent,
        LoginComponent,
        CalendarComponent,
        FoodsComponent,
        SignoutComponent,
        HeaderComponent,
        NavigationComponent,
        DiaryComponent,
        AddFoodComponent,
        EditFoodComponent,
    ],
    imports: [
        BrowserModule,
        RoutingModule,
        FormsModule,
        ReactiveFormsModule,
        AngularFireModule.initializeApp(environment.firebase),
        CoreModule,
        BrowserAnimationsModule,
        MaterialModule,
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule { }
