import { ActivatedRoute, Router } from '@angular/router'
import { Howl } from 'howler'
import { Salmo } from '../models/Salmos.model'
import { environment } from 'src/environments/environment'
import { SalmosService } from '../services/salmos.service'
import { Share } from '@capacitor/share'
import {
  IonRange,
  LoadingController,
  NavController,
  Gesture,
  GestureController,
  Platform,
  AlertController
} from '@ionic/angular';
import {
  Component,
  OnDestroy,
  OnInit,
  NgZone,
  ViewChild,
  HostListener,
  ElementRef,
  ChangeDetectorRef,
} from '@angular/core';

interface Track {
  name: string,
  path: string
}

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
})

export class Tab2Page implements OnInit, OnDestroy {
  @ViewChild('range', { static: false }) range: IonRange | undefined
  @ViewChild('rangeVol', { static: false }) rangeVol: IonRange | undefined

  @ViewChild('changeFontSize') tamanhoLetraElement!: ElementRef;
  @ViewChild('activatedFontSize') activatedFontSize!: ElementRef;

  @HostListener('document:click', ['$event'])
  handleClick(event: Event): void {
    const clickedInsideChangeFontSize = this.tamanhoLetraElement?.nativeElement?.contains(event.target as Node);
    const clickedInsideActivatedFontSize = this.activatedFontSize?.nativeElement?.contains(event.target as Node);

    if (!clickedInsideActivatedFontSize && !clickedInsideChangeFontSize) {
      this.fontSizeActive = false;
    }

    this.cdr.detectChanges()

  }

  baseUrl = environment.baseUrl

  aleatorioLocalStorage = localStorage.getItem('aleatorio')
  tamanhoPadrao = localStorage.getItem('tamanhoPadrao')
  autoplay = localStorage.getItem('autoplay')
  loop = localStorage.getItem('loop')

  aleatorio = this.aleatorioLocalStorage == 'true'

  fontSizeActive = false

  salmo: Salmo[] = []
  salmos: Salmo[] = []
  titulo: string | null = ''
  textoHtml!: HTMLElement

  backByGesture!: HTMLElement
  forwardByGesture!: HTMLElement

  arrastarParaProximo = false
  arrastarParaAnterior = false

  track: Track[] = []
  player: any
  id = 0
  volume: number | undefined = 50

  duracaoMin = 0
  duracaoSeg = 0
  tempoSeg = 0
  tempoMin = 0

  isPlaying = false
  progresso = 0
  playButton: any
  pauseButton: any

  gesture: Gesture | undefined
  proximoItem: any
  itemAnterior: any
  indexAtual = 0

  buscarPor = ''
  name = ''
  opcaoSelecionada = ''

  isDarkMode = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    public loadingCtrl: LoadingController,
    public navCtrl: NavController,
    private salmosService: SalmosService,
    private gestureCtrl: GestureController,
    private platform: Platform,
    private cdr: ChangeDetectorRef,
    private alertController: AlertController
  ) {

  }

  async ngOnInit() {
    let loading = await this.loadingCtrl.create({ message: 'Carregando arquivos...' })
    loading.present();

    this.aleatorioLocalStorage = localStorage.getItem('aleatorio')
    this.tamanhoPadrao = localStorage.getItem('tamanhoPadrao')
    this.autoplay = localStorage.getItem('autoplay')
    this.loop = localStorage.getItem('loop')

    this.aleatorio = this.aleatorioLocalStorage == 'true'
    this.titulo = this.route.snapshot.paramMap.get('titulo')

    this.salmo = this.salmosService.salmos.filter(obj => obj.titulo == this.titulo)

    if (this.salmo[0]) {
      this.gerarPlaylist()
        .then(() => this.gerarPlayer(this.track[0]))
        .then(() => this.router.navigate([`/tab2/${this.salmo[0].titulo}`]))
        .then(() => loading.dismiss())
        .catch(err => {
          loading.dismiss()
          console.error(err)
          this.errorAlert(err)
        })
    } else {
      loading.dismiss()
      console.error('Não conseguimos carregar os arquivos')
      this.errorAlert('Não conseguimos carregar os arquivos')
    }

    this.platform.backButton.subscribeWithPriority(10, () => {
      this.unload()
      this.router.navigate(['/'])
    })
  }

  ngAfterViewInit() {
    this.textoHtml = <HTMLElement>document.getElementById(`textoHtml${this.salmo[0].id}`)
    this.playButton = <HTMLElement>document.getElementById('play')
    this.pauseButton = <HTMLElement>document.getElementById('pause')
    this.backByGesture = <HTMLElement>document.getElementById('skipBackByGesture')
    this.forwardByGesture = <HTMLElement>document.getElementById('skipForwardByGesture')
    this.salmos = this.salmosService.salmos
    this.aleatorio = this.salmosService.aleatorio
    this.loop = this.salmosService.loop
    this.autoplay = this.salmosService.autoplay
    this.indexAtual = this.salmosService.indexAnterior + 1
    this.textoHtml.style.fontSize = `${this.tamanhoPadrao}pt`
    this.criarGesture(this.textoHtml)
  }

  ngOnDestroy(): void {
    this.gesture?.destroy()
    this.unload()
  }

  async errorAlert(err: any) {
    const alert = await this.alertController.create({
      header: 'Oops...',
      subHeader: `Tivemos um problema:`,
      message: err,
      buttons: [{
        text: 'Ok',
        handler: () => {
          window.location.reload()
        }
      }],
    });
    await alert.present();
  }

  async gerarPlaylist() {
    this.track = [{
      name: this.salmo[0].titulo,
      path: `${this.baseUrl}/${this.salmo[0].audio_path}/${this.salmo[0].audio_name}`
    }]
    return this.track
  }

  gerarPlayer(track: Track) {
    this.player = new Howl({
      src: [track.path],
      autoplay: this.autoplay == 'true',
      html5: true,
      loop: this.loop == 'true',
      onload: () => {
        this.duracaoMin = Math.floor(this.player.duration() / 60)
        this.duracaoSeg = Math.floor(this.player.duration() % 60)
      },
      onplay: () => {
        this.isPlaying = true
        this.atualizarProgresso()
        setInterval(() => {
          this.tempoMin = Math.floor(this.player.seek() / 60)
          this.tempoSeg = this.player.seek() % 60
        }, 1000)
      },
      onend: () => {
        this.stop()
        if (this.loop == 'true') this.play()
        else if (this.autoplay == 'true') this.navegarProximo()
      },
      onloaderror: () => alert('Erro ao carregar o áudio'),
    })
  }

  unload() {
    this.player.unload()
  }

  play() {
    this.player.play()
    this.isPlaying = true
  }

  pause() {
    this.player.pause()
    this.isPlaying = false
  }

  stop() {
    this.player.stop()
    this.isPlaying = false
    clearInterval(this.progresso)
  }

  seek() {
    let posAtual = this.range?.value
    let duracao = this.player.duration()
    this.player.seek(duracao * (parseFloat(`${posAtual}`) / 100))
  }

  atualizarProgresso() {
    let seek = this.player.seek()
    this.progresso = (seek / this.player.duration()) * 100 || 0
    setTimeout(() => {
      this.atualizarProgresso()
    }, 100)
  }

  setLoop() {
    this.salmosService.loop == 'true' ? this.salmosService.loop = 'false' : this.salmosService.loop = 'true'
    this.loop = this.salmosService.loop
    localStorage.setItem('loop', '' + this.loop)
  }

  setAleatorio() {
    this.salmosService.aleatorio = !this.salmosService.aleatorio
    this.aleatorio = this.salmosService.aleatorio
    const stringAleatorio = this.aleatorio ? 'true' : 'false'
    localStorage.setItem('aleatorio', stringAleatorio)
  }

  setAutoplay() {
    this.salmosService.autoplay == 'true' ? this.salmosService.autoplay = 'false' : this.salmosService.autoplay = 'true'
    this.autoplay = this.salmosService.autoplay
    localStorage.setItem('autoplay', '' + this.autoplay)
  }

  tamanhoLetra(sinal: string) {
    let tamanho = parseInt(localStorage.getItem('tamanhoPadrao') as string)
    if (sinal == '+') {
      tamanho += 1
      localStorage.setItem('tamanhoPadrao', '' + tamanho)
    } else if (sinal == '-') {
      tamanho -= 1
      localStorage.setItem('tamanhoPadrao', '' + tamanho)
    }
    this.textoHtml.style.fontSize = `${tamanho}pt`
    localStorage.setItem('tamanhoPadrao', '' + tamanho)
  }

  navegarProximo() {
    this.proximoItem = this.salmosService.mudarSalmo(this.salmo[0], false)
    this.player.stop()
    this.unload()
    this.router.navigate([`/tab2/${this.proximoItem.titulo}`])
  }

  navegarAnterior() {
    this.itemAnterior = this.salmosService.mudarSalmo(this.salmo[0], true)
    this.player.stop()
    this.unload()
    this.router.navigate([`/tab2/${this.itemAnterior.titulo}`])
  }

  criarGesture(elementoHTML: any) {
    if (elementoHTML) {
      this.gesture = this.gestureCtrl.create({
        el: elementoHTML,
        threshold: 10,
        gestureName: 'swipe',
        onMove: ev => {
          if (ev.deltaX > 5) {
            this.backByGesture.style.display = 'block'
            if (ev.deltaX > 140) {
              this.arrastarParaAnterior = true
            }
          } else if (ev.deltaX < -5) {
            this.forwardByGesture.style.display = 'block'
            if (ev.deltaX < -140) {
              this.arrastarParaProximo = true
            }
          }
        },
        onEnd: () => {
          this.backByGesture.style.display = 'none'
          this.forwardByGesture.style.display = 'none'
          if (this.arrastarParaAnterior) this.navegarAnterior()
          if (this.arrastarParaProximo) this.navegarProximo()
        }
      }, true);
      this.gesture.enable();
    }
  }

  confirm() {
    this.player.stop()
    this.router.navigate([`/tab2/${this.opcaoSelecionada}`])
  }

  compartilhar() {
    const title = this.salmo[0].titulo.replace(/(<([^>]+)>)/ig, ' ')
    const text = `Cante o ${this.salmo[0].titulo.replace(/(<([^>]+)>)/ig, ' ').replace(/&nbsp;/g, '')}:`
    const titleUrl = this.salmo[0].titulo.replace(/ /g, '%20');
    const url = `${this.baseUrl}/cante-os-salmos/${titleUrl}`
    const dialogTitle = 'Ouça este salmo.'
    Share.share({
      title: title,
      text: text,
      url: url,
      dialogTitle: dialogTitle
    });
  }

}