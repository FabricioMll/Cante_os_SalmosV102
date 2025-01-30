import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { Salmo } from '../models/Salmos.model';
import { Classificacao } from '../models/Classificacao.model';
import { Observable, Subject, of, timer } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { LoadingController, AlertController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class SalmosService {
  baseUrl = environment.baseUrl
  retornoApi: any;

  aleatorioLocalStorage = localStorage.getItem('aleatorio') || 'false'
  tamanhoPadrao = localStorage.getItem('tamanhoPadrao') || '14'
  autoplay = localStorage.getItem('autoplay') || 'false'
  loop = localStorage.getItem('loop') || 'false'

  aleatorio = this.aleatorioLocalStorage === 'true'

  salmos: Salmo[] = []
  classificacao: Classificacao[] = []
  versao: string = ''
  alertNewVersion: string | null = ''

  numbers: Array<number> = []
  randomNumbers: Array<number> = []
  playListAleatoria: any = []

  mudarParaIndex: number = 0
  indexAnterior: number = -1
  primeiroItem: boolean = true

  private salmosSubject = new Subject<Salmo[]>();
  private classificacaoSubject = new Subject<Classificacao[]>();

  constructor(
    private http: HttpClient,
    private loadingCtrl: LoadingController,
    private alertController: AlertController,
  ) {
    localStorage.setItem('aleatorio', this.aleatorioLocalStorage)
    localStorage.setItem('tamanhoPadrao', this.tamanhoPadrao)
    localStorage.setItem('autoplay', this.autoplay)
    localStorage.setItem('loop', this.loop)
  }

  async read() {
    let requestTimeDone = false
    if (this.salmos.length == 0) {
      const requestTimer$ = timer(2500)
      let loading = await this.loadingCtrl.create({
        message: this.randomBiblicalMessage()
      })
      loading.present()
      requestTimer$.subscribe(() => { requestTimeDone = true })
      return this.http.get<Salmo[]>(`${this.baseUrl}/listar`)
        .subscribe(res => {
          this.retornoApi = res
          this.updateData()
          if (requestTimeDone) loading.dismiss()
          else requestTimer$.subscribe(() => loading.dismiss())
        });

    }

    return

  }

  async updateData(): Promise<void> {
    if (this.retornoApi) {
      this.versao = this.retornoApi[2]
      this.salmos = this.retornoApi[0]
      console.table(this.salmos)
      this.classificacao = this.retornoApi[1]
      this.salmosSubject.next(this.salmos);
      this.classificacaoSubject.next(this.classificacao)
      if (this.versao != '' && this.versao != '1.0.2') this.presentAlert()
    }
    return
  }

  async presentAlert() {
    const alert = await this.alertController.create({
      header: 'Notícia Boa!',
      subHeader: `Nova versão disponível para download`,
      message: `Clique
                  <a href='https://salmos.iprcampobom.com.br/download-app' target='blank'>
                    aqui
                  </a>
                  para baixar a versão ${this.versao} do app.`,
      buttons: [{
        text: 'Manter a versão atual'
      }],
    });
    await alert.present();
  }

  varObserve(): { salmo$: Observable<Salmo[]>, classificacao$: Observable<Classificacao[]> } {
    return {
      salmo$: this.salmosSubject.asObservable(),
      classificacao$: this.classificacaoSubject.asObservable()
    }
  }

  mudarSalmo(salmoAtual: Salmo, voltar: boolean) {
    this.indexAnterior = this.salmos.findIndex((item: any) => item.id === salmoAtual.id);
    if (this.aleatorio) {
      voltar ? this.mudarParaIndex <= 0 ? this.mudarParaIndex = this.salmos.length - 1 : this.mudarParaIndex -= 1 : this.mudarParaIndex += 1
      if (!voltar && this.primeiroItem) {
        this.primeiroItem = false
        for (let i = 0; i < this.salmos.length; i++) {
          this.numbers.push(i);
        }
        while (this.numbers.length > 0) {
          let randomIndex = Math.floor(Math.random() * this.numbers.length);
          let randomNumber = this.numbers[randomIndex];
          this.randomNumbers.push(randomNumber);
          this.numbers.splice(randomIndex, 1);
        }
      }
      if (this.mudarParaIndex === this.salmos.length) {
        this.randomNumbers = []
        this.mudarParaIndex = 0
        this.primeiroItem = true
        this.mudarSalmo(salmoAtual, voltar)
      }

      return this.salmos[this.randomNumbers[this.mudarParaIndex]]

    } else {
      const proxIndex = voltar ? this.indexAnterior - 1 : this.indexAnterior + 1;
      if (!this.salmos[proxIndex]) return this.salmos[0]
      return this.salmos[proxIndex]
    }
  }

  randomBiblicalMessage() {
    const randomNumber = Math.floor(Math.random() * 10)

    return this.verseArray[randomNumber]

  }

  verseArray = [
    '"Apresentemo-nos diante dele com ações de graças e celebremo-lo com salmos" (Salmos 95:1-2)',
    '"Falando entre vós em salmos, e hinos, e cânticos espirituais" (Efésios 5:19)',
    '"...ensinando-vos e admoestando-vos uns aos outros, com salmos, hinos e cânticos espirituais" (Colossenses 3:16)',
    '"Cantai ao Senhor, bendizei o seu nome; anunciai a sua salvação de dia em dia" (Salmos 96:1-2)',
    '"Cantai-lhe, cantai-lhe salmos; narrai todas as suas maravilhas" (Salmos 105:2)',
    '"Louvai ao Senhor. Cantai ao Senhor um cântico novo, e o seu louvor na assembleia dos santos (Salmos 149:1)',
    '"Cantai-lhe um cântico novo; tocai bem e com júbilo (Salmos 33:1-3)',
    '"Porque Deus é o Rei de toda a terra; cantai louvores com inteligência (Salmos 47:6-7)',
    '"Cantai louvores ao Senhor, que habita em Sião" (Salmos 9:11)',
    '"Com os lábios se alegrará a minha boca quando eu te cantar, e a minha alma, que tu remiste" (Salmos 71:23)'
  ]

}
