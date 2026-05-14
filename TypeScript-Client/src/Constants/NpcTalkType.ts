enum NpcTalkType {
  TextOnly      = 0,  // SENDNEXT — text with Next button only
  SendNextPrev  = 1,  // SENDPREV — text with Prev + Next buttons
  YesNo         = 2,  // SENDYESNO
  GetNumber     = 3,  // SENDGETNUMBER — number input
  Selection     = 4,  // SENDSELECTION — list of choices
  GetText       = 5,  // SENDGETTEXT — text input field
  TextOkOnly    = 6,  // SENDGETDIRECTION — text with single OK button
  AcceptDecline = 9,  // SENDACCEPTDECLINE
}

export default NpcTalkType;
