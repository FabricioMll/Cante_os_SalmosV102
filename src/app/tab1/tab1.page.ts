import { environment } from 'src/environments/environment';
import { Salmo } from '../models/Salmos.model';
import { Classificacao } from '../models/Classificacao.model';
import { LoadingController, IonModal, AlertController } from '@ionic/angular';
import { SalmosService } from '../services/salmos.service'
import { OverlayEventDetail } from '@ionic/core/components';
import { Component, OnInit, ViewChild } from '@angular/core';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})

export class Tab1Page implements OnInit {
  @ViewChild(IonModal) modal!: IonModal;

  baseUrl = environment.baseUrl
  displayedColumns = ['name']
  salmos: Salmo[] = []
  classificacao: Classificacao[] = []

  opcaoSelecionada: string = ''
  buscarPor: string = ''
  logs: string[] = [];
  name: string = ''
  buscandoPor: string = ''
  dados: Salmo[] = []
  playlistSelecionada: boolean = false
  carregamento: number = 0
  isVisible: boolean = false

  observable: Observable<{salmos: Salmo[], classificacao: Classificacao[]}>;
  observer: any;

  constructor(
    public loadingCtrl: LoadingController,
    private salmosService: SalmosService
  ) {
    this.observable = new Observable((observer) => {
      this.observer = observer;
    });
  }

  async ngOnInit() {
    const observables = this.salmosService.varObserve();
    observables.salmo$.subscribe(updated => this.salmos = updated);
    observables.classificacao$.subscribe(updated => this.classificacao = updated);
    this.salmosService.read()
    await this.salmosService.updateData()
  }

  refresh() {
    location.reload()
  }

  buscar() {
    this.dados = []
    this.buscandoPor = this.buscarPor
    let filtro: string = this.buscarPor.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f,]/g, '')
      .replace(/ç/g, 'c')
      .replace(/Ç/g, 'C')
      .replace(/[' '-]+/g, " ")
      .trim()

    this.dados = this.salmosService.salmos.filter(e => {
      const valores = Object.values(e)
      return valores.some(valor => {
        if (typeof valor == 'string') {
          if (/^[0-9]+$/.test(filtro)) {
            return valor.replace(/(<([^>]+)>)/ig, ' ')
              .replace(/[' ']+/g, " ")
              .trim()
              .includes(`Salmo ${filtro}`)
          } else {
            return valor.toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f,]/g, '')
              .replace(/ç/g, 'c')
              .replace(/Ç/g, 'C')
              .replace(/(<([^>]+)>)/ig, ' ')
              .replace(/[' '-]+/g, " ")
              .trim()
              .includes(filtro);
          }
        }
        return false;
      })
    })
    this.salmos = this.dados
  }

  cancelModalFilter() {
    this.modal.dismiss(null, 'cancel');
  }

  confirmModalFilter() {
    this.modal.dismiss(this.name, 'confirm');
  }

  criarPlaylistSelecionada() {
    this.playlistSelecionada = !this.playlistSelecionada
    this.playlistSelecionada ? this.salmosService.salmos = this.dados : ''
  }

  onWillDismiss(event: Event) {
    const ev = event as CustomEvent<OverlayEventDetail<string>>;
    this.dados = []
    if (ev.detail.role === 'confirm') {

      let filtro = this.opcaoSelecionada
      this.salmosService.salmos.filter(e => {
        if (e.classificacao) {
          e.classificacao.filter(item => item == filtro ? this.dados.push(e) : '')
        }
      })

      this.salmos = this.dados
      this.buscandoPor = this.opcaoSelecionada

    }
  }

}
