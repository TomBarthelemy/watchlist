import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { PopcornEmitterDirective } from '../../directives/popcorn-emitter.directive';
import { SearchFormComponent } from '../search-form/search-form.component';
import { SupaService } from '../../services/supa.service';
import { ListItemComponent } from "../list-item/list-item.component";

@Component({
  selector: 'app-watchlist',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatSlideToggleModule,
    PopcornEmitterDirective,
    SearchFormComponent,
    ListItemComponent
],
  templateUrl: './watchlist.component.html',
  styleUrls: ['./watchlist.component.scss'],
})
export class WatchlistComponent {
  private readonly supa = inject(SupaService);

  total = computed(() => this.supa.items().length);
  seenCount = computed(() => this.supa.items().filter((i) => i.seen).length);
}
