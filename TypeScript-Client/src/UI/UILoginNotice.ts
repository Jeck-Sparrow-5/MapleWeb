import MapleButton from './MapleButton';
import WZManager from '../wz-utils/WZManager';
import ClickManager from './ClickManager';
import {MapleStanceButton} from './MapleStanceButton';
import GameCanvas from '../GameCanvas';
import {CameraInterface} from '../Camera';

export enum NoticeType {
  NORMAL = 0,
  ABNORMAL = 1,
}

export enum NoticeMessage {
  VULGAR_NAME,
  DELETE_CHAR_ENTER_BIRTHDAY,
  NOT_REGISTERED_EMAIL,
  INCORRECT_PASSWORD,
  INCORRECT_EMAIL,
  NAME_IN_USE,
  NAME_CAN_USE,
  RETURN_TO_FIRST_PAGE,
  NAME_IN_USE_2,
  NO_MORE_CHARACTERS,
  CANNOT_USE_NAME,
  INCORRECT_BIRTHDAY_CODE,
  PRESS_TO_CHECK_NAME,
  CONFIRM_DELETE_CHARACTER,
  AGE_SELECT_ANOTHER_CHANNEL,
  TROUBLE_LOGGING_IN,
  BLOCKED_ID,
  ALREADY_LOGGED_IN,
  UNKNOWN_ERROR,
  TOO_MANY_REQUESTS,
  NOT_REGISTERED_ID,
  UNABLE_TO_LOGIN_AS_MASTER_AT_IP,
  UNABLE_TO_LOGIN_GAME_SERVER,
  UNABLE_TO_CONNECT_GAME_SERVER,
  AN_ERROR_OCCURRED,
  AN_ERROR_OCCURRED_2,
  NO_ACCESS_TO_GAME,
  WRONG_GATEWAY,
  INCORRECT_LOGIN_ID,
  INCORRECT_FORM_OF_ID,
  UNVERIFIED_ACCOUNT_BLOCK,
  UNVERIFIED_ACCOUNT_DELETE,
  KOREAN,
  VERIFY_ACCOUNT_VIA_EMAIL,
  CANNOT_DELETE_GUILD_MASTER,
  SUSPICIOUS_PROGRAMS,
  POPULATION_TOO_HIGH,
  SELECT_A_CHANNEL,
  GAME_GUARD_UPDATED,
  CANNOT_DELETE_ENGAGED,
  PLEASE_SIGN_UP_EU,
  PASSWORD_IS_INCORRECT,
  SECOND_PASSWORD_INCORRECT,
  TEMPORARY_IP_BAN,
  DISABLE_SAFETY_MEASURE,
  SECOND_PASSWORD_NOT_DIFFERENT,
  CANNOT_DELETE_ENGAGED_2,
  SELECT_A_CHANNEL_2 = 81,
  GAME_GUARD_UPDATED_2,
}

export default class UILoginNotice {
  private uiLoginNotice: any = null;
  private noticeType: NoticeType;
  private noticeMessage: NoticeMessage | null = null;
  opts: any;
  x: number = 0;
  y: number = 0;
  isHidden: boolean;
  buttons: MapleButton[];
  okHandler: (() => void) | null = null;
  cancelHandler: (() => void) | null = null;

  static async fromOpts(opts: any) {
    const object = new UILoginNotice(opts);
    await object.load();
    return object;
  }

  constructor(opts: any) {
    this.x = opts.x || 0;
    this.y = opts.y || 0;
    this.isHidden = typeof opts.isHidden !== 'undefined' ? opts.isHidden : true;
    this.noticeType = typeof opts.noticeType !== 'undefined' ? opts.noticeType : NoticeType.NORMAL;
    this.noticeMessage = typeof opts.noticeMessage !== 'undefined' ? opts.noticeMessage : null;
    this.opts = opts;
    this.buttons = [];
  }

  async load() {
    const opts = this.opts;
    this.x = opts.x;
    this.y = opts.y;

    this.uiLoginNotice = await WZManager.get('UI.wz/Login.img/Notice');
    this.loadButtons();
  }

  loadButtons() {
    this.buttons.forEach((button) => {
      ClickManager.removeButton(button);
    });
    this.buttons = [];
    const okButton = new MapleStanceButton(null, {
      x: this.x + 160,
      y: this.y + 150,
      isRelativeToCamera: true,
      isPartOfUI: true,
      img: this.uiLoginNotice?.BtYes?.nChildren ?? [],
      onClick: () => {
        this.setIsHidden(true);
      },
    });
    this.buttons.push(okButton);
    this.buttons.forEach((button) => {
      ClickManager.addButton(button);
    });
  }

  draw(
    canvas: GameCanvas,
    camera: CameraInterface,
    lag: number,
    msPerTick: number,
    tdelta: number
  ) {
    if (this.isHidden) {
      return;
    }
    canvas.drawImage({
      img: this.uiLoginNotice?.backgrnd?.nGet(this.noticeType)?.nGetImage(),
      dx: this.x,
      dy: this.y,
    });
    if (this.noticeMessage && this.uiLoginNotice?.text?.nGet(this.noticeMessage)) {
      canvas.drawImage({
        img: this.uiLoginNotice?.text?.nGet(this.noticeMessage)?.nGetImage(),
        dx: this.x + 125,
        dy: this.y + 25,
      });
    }

    this.buttons.forEach((obj) => {
      obj.draw(canvas, camera, lag, msPerTick, tdelta);
    });
  }

  setIsHidden(isHidden: boolean) {
    this.isHidden = isHidden;
    this.buttons.forEach((button) => {
      button.isHidden = isHidden;
    });
  }

  setNoticeType(noticeType: NoticeType) {
    this.noticeType = noticeType;
  }

  setNoticeMessage(noticeMessage: NoticeMessage | null) {
    this.noticeMessage = noticeMessage;
  }
}
