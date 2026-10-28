/**
 * Google Apps Script: приймає замовлення з GitHub Pages і надсилає його в Telegram.
 *
 * Налаштування:
 * 1. У налаштуваннях проєкту Apps Script додайте Script Properties:
 *    TG_BOT_TOKEN = ваш НОВИЙ токен бота
 *    TG_CHAT_ID = ID вашого Telegram-чату
 * 2. Deploy -> New deployment -> Web app
 *    Execute as: Me
 *    Who has access: Anyone
 * 3. Скопіюйте URL /exec у ORDER_ENDPOINT в index.html.
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents || '{}');
    var props = PropertiesService.getScriptProperties();
    var token = props.getProperty('TG_BOT_TOKEN');
    var chatId = props.getProperty('TG_CHAT_ID');

    if (!token || !chatId) {
      throw new Error('Missing TG_BOT_TOKEN or TG_CHAT_ID in Script Properties');
    }

    if (!data.name || !data.phone || !data.address ||
        !Array.isArray(data.items) || data.items.length === 0) {
      throw new Error('Invalid order data');
    }

    var safe = function(value) {
      return String(value == null ? '' : value).replace(/[<>]/g, '').trim();
    };

    var total = 0;
    var message = '🛍 Нове замовлення у Парфюм Маркет!\\n\\n';
    message += "👤 Ім'я: " + safe(data.name) + '\\n';
    message += '📞 Телефон: ' + safe(data.phone) + '\\n';
    message += '📍 Адреса: ' + safe(data.address) + '\\n';
    if (data.comment) message += '💬 Коментар: ' + safe(data.comment) + '\\n';
    message += '\\n🛒 Товари:\\n';

    data.items.forEach(function(item, index) {
      var price = Number(item.price);
      var quantity = Number(item.quantity);
      if (!item.name || !Number.isFinite(price) || price < 0 ||
          !Number.isInteger(quantity) || quantity < 1) {
        throw new Error('Invalid item');
      }
      total += price * quantity;
      message += (index + 1) + '. ' + safe(item.name) + ' (' +
        safe(item.volume) + ') — ' + quantity + ' шт. по ' + price + ' грн\\n';
    });
    message += '\\n💰 Загальна сума: ' + total + ' грн';

    var response = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ chat_id: chatId, text: message }),
      muteHttpExceptions: true
    });

    var result = JSON.parse(response.getContentText());
    if (!result.ok) throw new Error('Telegram API error: ' + (result.description || 'unknown'));

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    console.error(err);
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
