import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CalendarComponent } from '../calendar/calendar.component';
import { LoginComponent } from '../auth/login/login.component';
import { AuthGuard } from '../auth/auth.guard';
import { FoodsComponent } from '../foods/foods.component';
import { AddFoodComponent } from '../foods/add-food/add-food.component';
import { EditFoodComponent } from '../foods/edit-food/edit-food.component';
import { DiarySummaryComponent } from '../components/diary/diary-summary/diary-summary.component';
import { AddPortionComponent } from '../components/diary/add-portion/add-portion.component';
import { DiaryOutletComponent } from '../components/diary/diary-outlet/diary-outlet.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'calendar', component: CalendarComponent, canActivate: [AuthGuard] },
  { path: 'foods', component: FoodsComponent, canActivate: [AuthGuard] },
  { path: 'addfood', component: AddFoodComponent, canActivate: [AuthGuard] },
  { path: 'food/:id', component: EditFoodComponent, canActivate: [AuthGuard] },
  {
    path: 'diary/:day-:month-:year', component: DiaryOutletComponent, canActivate: [AuthGuard],
    children: [
      //{ path: 'summary', component: DiarySummaryComponent },
      { path: '', component: DiarySummaryComponent },
      { path: 'add-portion', component: AddPortionComponent }
    ]
  },


  { path: '', redirectTo: '/foods', pathMatch: 'full' },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes)
  ],
  exports: [RouterModule]
})
export class RoutingModule { }